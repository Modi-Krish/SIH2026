import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@sapls/database';
import { TimetableService } from '../timetable/timetable.service';
import { RecommendationService } from '../recommendation/recommendation.service';

@Injectable()
export class RoutineService {
  private readonly logger = new Logger(RoutineService.name);

  constructor(
    private timetableService: TimetableService,
    private recommendationService: RecommendationService,
  ) {}

  async generateDailyRoutine(studentId: string, dateString: string) {
    const date = new Date(dateString);
    
    // 1. Get Timetable Slots
    const classes = await this.timetableService.getStudentTimetable(studentId, date);
    
    // 2. Get Free Periods
    const freePeriods = await this.timetableService.getFreePeriods(studentId, date);

    // 3. For each free period, get a recommendation if it's longer than 30 mins
    const recommendedTasks = [];
    for (const fp of freePeriods) {
      if (fp.durationMins >= 30) {
        try {
          const recData = await this.recommendationService.getRecommendations(studentId, fp.durationMins);
          
          if (recData && recData.recommendations && recData.recommendations.length > 0) {
             const topRec = recData.recommendations[0];
             recommendedTasks.push({
               type: 'LEARNING_TASK',
               startTime: fp.startTime,
               endTime: fp.endTime,
               title: topRec.title,
               category: topRec.category,
               url: topRec.url,
               difficulty: topRec.difficulty
             });
          }
        } catch (e: any) {
          this.logger.warn(`Could not fetch recommendation for free period: ${e.message}`);
          // Fallback task
          recommendedTasks.push({
            type: 'SELF_STUDY',
            startTime: fp.startTime,
            endTime: fp.endTime,
            title: 'Self Study / Library Time',
            durationMins: fp.durationMins
          });
        }
      } else {
        // Short break
        recommendedTasks.push({
            type: 'BREAK',
            startTime: fp.startTime,
            endTime: fp.endTime,
            title: 'Short Break',
            durationMins: fp.durationMins
        });
      }
    }

    // 4. Merge and sort
    const mappedClasses = classes.map(c => ({
      type: 'CLASS',
      startTime: c.startTime,
      endTime: c.endTime,
      title: c.subject.name,
      room: c.classroom.name,
      teacher: c.teacher.user.name,
    }));

    const routine = [...mappedClasses, ...recommendedTasks];
    routine.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      studentId,
      date: dateString,
      routine
    };
  }
}
