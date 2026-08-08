import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@sapls/database';

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
}
