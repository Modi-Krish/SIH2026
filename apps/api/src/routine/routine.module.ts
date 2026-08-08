import { Module } from '@nestjs/common';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';
import { TimetableModule } from '../timetable/timetable.module';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [TimetableModule, RecommendationModule],
  controllers: [RoutineController],
  providers: [RoutineService]
})
export class RoutineModule {}
