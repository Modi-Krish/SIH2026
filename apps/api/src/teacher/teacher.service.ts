import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@sapls/database';

const prisma = new PrismaClient();

@Injectable()
export class TeacherService {
  async findAll() {
    return prisma.teacher.findMany({
      include: {
        user: true,
        department: true,
      },
    });
  }

  async findOne(id: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        department: true,
        timetableSlots: {
          include: {
            subject: true,
            classroom: true,
          }
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }
    return teacher;
  }

  async create(data: {
    email: string;
    name: string;
    collegeId: string;
    departmentId: string;
    designation?: string;
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
          role: 'TEACHER',
          supabaseId: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          departmentId: targetDeptId,
          designation: data.designation,
        },
        include: {
          user: true,
          department: true,
        },
      });

      return teacher;
    });
  }

  async update(id: string, data: {
    email?: string;
    name?: string;
    collegeId?: string;
    departmentId?: string;
    designation?: string;
  }) {
    const teacher = await this.findOne(id);
    return prisma.$transaction(async (tx) => {
      // Check if email or collegeId already exists on another user
      if (data.email || data.collegeId) {
        const conflictUser = await tx.user.findFirst({
          where: {
            id: { not: teacher.userId },
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
        where: { id: teacher.userId },
        data: {
          email: data.email,
          name: data.name,
          collegeId: data.collegeId,
        },
      });

      // Update Teacher details
      const updatedTeacher = await tx.teacher.update({
        where: { id },
        data: {
          departmentId: data.departmentId,
          designation: data.designation,
        },
        include: {
          user: true,
          department: true,
        },
      });

      return updatedTeacher;
    });
  }

  async delete(id: string) {
    const teacher = await this.findOne(id);
    return prisma.$transaction(async (tx) => {
      // Clear dependent records
      const sessions = await tx.attendanceSession.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await tx.attendanceRecord.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.attendanceSession.deleteMany({ where: { teacherId: teacher.id } });
      await tx.timetableSlot.deleteMany({ where: { teacherId: teacher.id } });

      await tx.teacher.delete({ where: { id: teacher.id } });
      await tx.user.delete({ where: { id: teacher.userId } });
      return { success: true, message: `Teacher ${id} and user profile deleted successfully` };
    });
  }

  async bulkDelete(ids: string[]) {
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: ids } },
      select: { id: true, userId: true },
    });

    const userIds = teachers.map((t) => t.userId);

    return prisma.$transaction(async (tx) => {
      const sessions = await tx.attendanceSession.findMany({
        where: { teacherId: { in: ids } },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      if (sessionIds.length > 0) {
        await tx.attendanceRecord.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.attendanceSession.deleteMany({ where: { teacherId: { in: ids } } });
      await tx.timetableSlot.deleteMany({ where: { teacherId: { in: ids } } });

      await tx.teacher.deleteMany({ where: { id: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });

      return { success: true, count: ids.length };
    });
  }
}
