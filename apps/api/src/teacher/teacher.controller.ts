import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.STUDENT)
  @Get()
  findAll() {
    return this.teacherService.findAll();
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER, ROLES.STUDENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }
}
