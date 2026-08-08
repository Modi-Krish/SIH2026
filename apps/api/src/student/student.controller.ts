import { Controller, Get, Param, UseGuards, Patch, UseInterceptors, UploadedFile, BadRequestException, Post, Body, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { StudentService } from './student.service';
import { JwtAuthGuard, Public } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post()
  create(@Body() body: { email: string; name: string; collegeId: string; departmentId: string; semester: number; rollNumber?: string; section?: string; macAddress?: string }) {
    return this.studentService.create(body);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.studentService.delete(id);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { email?: string; name?: string; collegeId?: string; departmentId?: string; semester?: number; rollNumber?: string; section?: string; macAddress?: string }
  ) {
    return this.studentService.update(id, body);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.studentService.bulkDelete(body.ids);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER)
  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Public()
  @Get('embeddings')
  getEmbeddings() {
    return this.studentService.getEmbeddings();
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER, ROLES.STUDENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }

  @Public()
  @Get(':id/photo-file')
  async getPhotoFile(@Param('id') id: string, @Res() res: any) {
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'students', `${id}.jpg`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Photo not found');
    }
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(filePath).pipe(res);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COUNSELOR, ROLES.TEACHER, ROLES.STUDENT)
  @Get(':id/attendance-stats')
  getAttendanceStats(@Param('id') id: string) {
    return this.studentService.getAttendanceStats(id);
  }

  @Roles(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TEACHER, ROLES.STUDENT)
  @Patch(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No photo uploaded');
    }
    return this.studentService.uploadPhoto(id, file);
  }
}
