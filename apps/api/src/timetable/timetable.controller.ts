import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

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
