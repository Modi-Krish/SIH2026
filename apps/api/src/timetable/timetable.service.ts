import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@sapls/database';

const prisma = new PrismaClient();

@Injectable()
export class TimetableService {
  async getStudentTimetable(studentId: string, date: Date) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return [];

    const dayOfWeek = date.getDay();
    const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][dayOfWeek];

    const slots = await prisma.timetableSlot.findMany({
      where: {
        departmentId: student.departmentId,
        semester: student.semester,
        day: dayName as any,
      },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        classroom: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return slots;
  }

  async getFreePeriods(studentId: string, date: Date) {
    const slots = await this.getStudentTimetable(studentId, date);
    const freePeriods = [];
    
    let lastEndTime = new Date(date);
    lastEndTime.setHours(9, 0, 0, 0);

    for (const slot of slots) {
      const [startH, startM] = slot.startTime.split(':').map(Number);
      const slotStartTime = new Date(date);
      slotStartTime.setHours(startH, startM, 0, 0);
      
      const diffMs = slotStartTime.getTime() - lastEndTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins > 0) {
        freePeriods.push({
          startTime: lastEndTime,
          endTime: slotStartTime,
          durationMins: diffMins
        });
      }

      const [endH, endM] = slot.endTime.split(':').map(Number);
      const slotEndTime = new Date(date);
      slotEndTime.setHours(endH, endM, 0, 0);
      lastEndTime = slotEndTime;
    }

    const endOfDay = new Date(date);
    endOfDay.setHours(16, 0, 0, 0);
    const finalDiffMs = endOfDay.getTime() - lastEndTime.getTime();
    if (finalDiffMs > 0) {
      freePeriods.push({
        startTime: lastEndTime,
        endTime: endOfDay,
        durationMins: Math.floor(finalDiffMs / 60000)
      });
    }

    return freePeriods;
  }

  async assignSlot(data: {
    subjectId: string;
    teacherId: string;
    classroomId: string;
    departmentId: string;
    semester: number;
    section?: string;
    day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
    startTime: string;
    endTime: string;
  }) {
    return prisma.timetableSlot.create({
      data: {
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        classroomId: data.classroomId,
        departmentId: data.departmentId,
        semester: Number(data.semester),
        section: data.section,
        day: data.day as any,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        classroom: true,
        department: true,
      },
    });
  }

  async deleteSlot(id: string) {
    await prisma.timetableSlot.delete({ where: { id } });
    return { success: true, message: `Timetable slot ${id} deleted` };
  }

  async getTeacherTimetable(teacherId: string, date: Date) {
    const dayOfWeek = date.getDay();
    const dayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][dayOfWeek];

    return prisma.timetableSlot.findMany({
      where: {
        teacherId: teacherId,
        day: dayName as any,
        isActive: true,
      },
      include: {
        subject: true,
        classroom: true,
        department: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
