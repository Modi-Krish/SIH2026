import { Controller, Get, Param, UseGuards, Post, Body, Delete, Patch } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post()
  create(@Body() body: { email: string; name: string; collegeId: string; departmentId: string; designation?: string }) {
    return this.teacherService.create(body);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.teacherService.delete(id);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { email?: string; name?: string; collegeId?: string; departmentId?: string; designation?: string }
  ) {
    return this.teacherService.update(id, body);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.teacherService.bulkDelete(body.ids);
  }

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
