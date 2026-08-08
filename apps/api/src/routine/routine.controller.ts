import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RoutineService } from './routine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/routines')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Roles(ROLES.STUDENT, ROLES.COUNSELOR, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('student/:id')
  getDailyRoutine(@Param('id') studentId: string, @Query('date') dateString?: string) {
    // Default to today if no date provided
    const date = dateString || new Date().toISOString();
    return this.routineService.generateDailyRoutine(studentId, date);
  }
}
