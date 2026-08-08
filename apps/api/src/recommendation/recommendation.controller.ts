import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ROLES } from '@sapls/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Roles(ROLES.STUDENT, ROLES.COUNSELOR, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Post('generate')
  generateRecommendations(@Body() data: { studentId: string; freePeriodDuration: number }) {
    return this.recommendationService.getRecommendations(data.studentId, data.freePeriodDuration);
  }

  @Roles(ROLES.STUDENT, ROLES.COUNSELOR, ROLES.ADMIN, ROLES.SUPER_ADMIN)
  @Get('student/:id')
  getStudentRecommendations(@Param('id') studentId: string) {
    return this.recommendationService.getStudentRecommendations(studentId);
  }
}
