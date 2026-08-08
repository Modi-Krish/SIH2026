import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post('mark')
  markAttendance(@Body() markDto: any) {
    return this.attendanceService.markAttendance(markDto);
  }

  @Roles(ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('session/:sessionId')
  getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }
}
