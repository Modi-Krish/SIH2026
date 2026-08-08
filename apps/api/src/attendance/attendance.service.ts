import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@sapls/database';

const prisma = new PrismaClient();

@Injectable()
export class AttendanceService {
  async markAttendance(data: { studentId: string; sessionId: string; status: any; faceConfidence?: number }) {
    const { studentId, sessionId, status, faceConfidence } = data;
    
    const record = await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        }
      },
      update: {
        status: status,
        faceConfidence: faceConfidence ? (faceConfidence as any) : undefined,
        checkedInAt: new Date(),
      },
      create: {
        sessionId,
        studentId,
        status: status,
        faceConfidence: faceConfidence ? (faceConfidence as any) : undefined,
        checkedInAt: new Date(),
      }
    });

    return record;
  }

  async getSessionAttendance(sessionId: string) {
    return prisma.attendanceRecord.findMany({
      where: {
        sessionId,
      },
      include: {
        student: {
          include: { user: true }
        }
      }
    });
  }
}
