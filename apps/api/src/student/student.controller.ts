import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER)
  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER, ROLES.STUDENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER, ROLES.STUDENT)
  @Get(':id/attendance-stats')
  getAttendanceStats(@Param('id') id: string) {
    return this.studentService.getAttendanceStats(id);
  }
}
