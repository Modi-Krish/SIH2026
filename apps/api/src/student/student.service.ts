import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@sapls/database';

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
}
