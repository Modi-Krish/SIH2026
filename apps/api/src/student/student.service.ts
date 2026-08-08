import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@sapls/database';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

@Injectable()
export class StudentService {
  async findAll() {
    return prisma.student.findMany({
      include: {
        user: true,
        department: true,
      },
    });
  }

  async findOne(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        devices: true,
        attendanceRecords: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }
    return student;
  }

  async getAttendanceStats(id: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: id },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const percentage = total > 0 ? (present / total) * 100 : 0;

    return {
      totalClasses: total,
      present,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    const student = await this.findOne(id);

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const formData = new FormData();
    formData.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);

    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/ai/face/enroll`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) {
        throw new BadRequestException(`Face enrollment failed: ${data.message}`);
      }

      const embeddingArray = data.embedding;
      const embeddingStr = `[${embeddingArray.join(',')}]`;

      // Save to database using raw SQL for the vector type
      await prisma.$executeRawUnsafe(`
        INSERT INTO face_embeddings (id, student_id, embedding, angle, version, is_active, created_at)
        VALUES (gen_random_uuid(), $1::uuid, $2::vector, 'neutral', 1, true, NOW())
      `, student.id, embeddingStr);

      // Save photo locally
      const uploadsDir = path.join(process.cwd(), 'uploads', 'students');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, `${id}.jpg`);
      fs.writeFileSync(filePath, file.buffer);

      // Update avatarUrl in database (points to custom endpoint)
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          avatarUrl: `http://localhost:3001/api/v1/students/${id}/photo-file`
        }
      });

      return { success: true, message: 'Student photo and embedding updated successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(`Failed to communicate with AI Service: ${(error as Error).message}`);
    }
  }

  async create(data: {
    email: string;
    name: string;
    collegeId: string;
    departmentId: string;
    semester: number;
    rollNumber?: string;
    section?: string;
    macAddress?: string;
  }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { collegeId: data.collegeId }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with given email or collegeId already exists');
    }

    let targetDeptId = data.departmentId;
    const existingDept = await prisma.department.findUnique({ where: { id: targetDeptId } }).catch(() => null);
    if (!existingDept) {
      const firstDept = await prisma.department.findFirst();
      if (firstDept) {
        targetDeptId = firstDept.id;
      } else {
        const newDept = await prisma.department.create({
          data: { name: 'Computer Science', code: 'CS' }
        });
        targetDeptId = newDept.id;
      }
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          collegeId: data.collegeId,
          name: data.name,
          role: 'STUDENT',
          supabaseId: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          departmentId: targetDeptId,
          semester: Number(data.semester),
          rollNumber: data.rollNumber === "" ? null : data.rollNumber || null,
          section: data.section,
        },
        include: {
          user: true,
          department: true,
        },
      });

      if (data.macAddress) {
        await tx.device.create({
          data: {
            studentId: student.id,
            macAddress: data.macAddress,
            deviceName: `${data.name}'s Primary Device`,
            deviceToken: `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          },
        });
      }

      return student;
    });
  }

  async update(id: string, data: {
    email?: string;
    name?: string;
    collegeId?: string;
    departmentId?: string;
    semester?: number;
    rollNumber?: string;
    section?: string;
    macAddress?: string;
  }) {
    const student = await this.findOne(id);
    return prisma.$transaction(async (tx) => {
      // Check if email or collegeId already exists on another user
      if (data.email || data.collegeId) {
        const conflictUser = await tx.user.findFirst({
          where: {
            id: { not: student.userId },
            OR: [
              ...(data.email ? [{ email: data.email }] : []),
              ...(data.collegeId ? [{ collegeId: data.collegeId }] : []),
            ],
          },
        });
        if (conflictUser) {
          throw new BadRequestException('User with given email or collegeId already exists');
        }
      }

      // Update User details
      await tx.user.update({
        where: { id: student.userId },
        data: {
          email: data.email,
          name: data.name,
          collegeId: data.collegeId,
        },
      });

      // Update Student details
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          departmentId: data.departmentId,
          semester: data.semester ? Number(data.semester) : undefined,
          rollNumber: data.rollNumber === undefined ? undefined : (data.rollNumber === "" ? null : data.rollNumber),
          section: data.section,
        },
        include: {
          user: true,
          department: true,
        },
      });

      if (data.macAddress !== undefined) {
        const existingDevice = await tx.device.findFirst({
          where: { studentId: id }
        });

        if (data.macAddress === "") {
          if (existingDevice) {
            await tx.device.delete({ where: { id: existingDevice.id } });
          }
        } else {
          const conflictDevice = await tx.device.findFirst({
            where: {
              macAddress: data.macAddress,
              studentId: { not: id }
            }
          });
          if (conflictDevice) {
            throw new BadRequestException('A device with this MAC address is already registered to another student');
          }

          if (existingDevice) {
            await tx.device.update({
              where: { id: existingDevice.id },
              data: { macAddress: data.macAddress }
            });
          } else {
            await tx.device.create({
              data: {
                studentId: id,
                macAddress: data.macAddress,
                deviceName: `${student.user?.name || "Student"}'s Device`,
                deviceToken: `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              }
            });
          }
        }
      }

      return updatedStudent;
    });
  }

  async getEmbeddings() {
    const embeddings = await prisma.$queryRawUnsafe<any[]>(`
      SELECT student_id as "studentId", embedding::text
      FROM face_embeddings
      WHERE is_active = true
    `);

    return embeddings.map((e) => {
      let emb: number[] = [];
      if (typeof e.embedding === 'string') {
        const clean = e.embedding.replace('[', '').replace(']', '');
        emb = clean.split(',').map((val: string) => parseFloat(val));
      } else if (Array.isArray(e.embedding)) {
        emb = e.embedding;
      }
      return {
        studentId: e.studentId,
        embedding: emb,
      };
    });
  }

  async delete(id: string) {
    const student = await this.findOne(id);
    return prisma.$transaction(async (tx) => {
      // Delete dependent records first
      await tx.dailyRoutine.deleteMany({ where: { studentId: student.id } });
      await tx.recommendation.deleteMany({ where: { studentId: student.id } });
      await tx.attendanceRecord.deleteMany({ where: { studentId: student.id } });
      await tx.device.deleteMany({ where: { studentId: student.id } });
      await tx.faceEmbedding.deleteMany({ where: { studentId: student.id } });
      await tx.careerGoal.deleteMany({ where: { studentId: student.id } });
      await tx.studentSkill.deleteMany({ where: { studentId: student.id } });

      await tx.student.delete({ where: { id: student.id } });
      await tx.user.delete({ where: { id: student.userId } });
      return { success: true, message: `Student ${id} and user profile deleted successfully` };
    });
  }

  async bulkDelete(ids: string[]) {
    const students = await prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, userId: true },
    });

    const userIds = students.map((s) => s.userId);

    return prisma.$transaction(async (tx) => {
      await tx.dailyRoutine.deleteMany({ where: { studentId: { in: ids } } });
      await tx.recommendation.deleteMany({ where: { studentId: { in: ids } } });
      await tx.attendanceRecord.deleteMany({ where: { studentId: { in: ids } } });
      await tx.device.deleteMany({ where: { studentId: { in: ids } } });
      await tx.faceEmbedding.deleteMany({ where: { studentId: { in: ids } } });
      await tx.careerGoal.deleteMany({ where: { studentId: { in: ids } } });
      await tx.studentSkill.deleteMany({ where: { studentId: { in: ids } } });

      await tx.student.deleteMany({ where: { id: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });

      return { success: true, count: ids.length };
    });
  }
}
