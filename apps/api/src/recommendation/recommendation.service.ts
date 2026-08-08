import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from '@sapls/database';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  async getRecommendations(studentId: string, freePeriodDuration: number) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const payload = {
      student_id: student.id,
      career_goal: student.careerGoal || 'Software Engineer',
      skills: student.skills || ['JavaScript', 'Python'],
      interests: student.interests || ['AI', 'Web Development'],
      free_period_duration: freePeriodDuration,
    };

    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with status: ${response.status}`);
      }

      const data = await response.json();
      
      for (const rec of data.recommendations) {
        await prisma.recommendation.create({
          data: {
            studentId: student.id,
            title: rec.title,
            category: rec.category,
            contentUrl: rec.url,
            difficulty: rec.difficulty,
            estimatedDuration: rec.duration,
          }
        });
      }

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch recommendations: ${error.message}`);
      throw new HttpException('Failed to generate recommendations from AI service', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getStudentRecommendations(studentId: string) {
    return prisma.recommendation.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
