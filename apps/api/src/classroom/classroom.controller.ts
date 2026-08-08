import { Controller, Get } from '@nestjs/common';
import { ClassroomService } from './classroom.service';

@Controller('v1/classroom')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Get('hotspot-status')
  getHotspotStatus() {
    return this.classroomService.getHotspotStatus();
  }

  @Get('departments')
  getDepartments() {
    return this.classroomService.getDepartments();
  }
}
