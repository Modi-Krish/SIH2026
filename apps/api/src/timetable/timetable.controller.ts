import { Controller, Get, Param, Query, UseGuards, Post, Body, Delete } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post('assign')
  assignSlot(@Body() body: {
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
    return this.timetableService.assignSlot(body);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Delete('slot/:id')
  deleteSlot(@Param('id') id: string) {
    return this.timetableService.deleteSlot(id);
  }

  @Roles(ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('teacher/:id')
  getTeacherTimetable(@Param('id') teacherId: string, @Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.timetableService.getTeacherTimetable(teacherId, date);
  }

  @Roles(ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('student/:id')
  getStudentTimetable(@Param('id') studentId: string, @Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.timetableService.getStudentTimetable(studentId, date);
  }

  @Roles(ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('student/:id/free-periods')
  getFreePeriods(@Param('id') studentId: string, @Query('date') dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date();
    return this.timetableService.getFreePeriods(studentId, date);
  }
}
