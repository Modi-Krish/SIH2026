import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StudentModule } from './student/student.module';
import { TeacherModule } from './teacher/teacher.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TimetableModule } from './timetable/timetable.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { RoutineModule } from './routine/routine.module';
import { MqttModule } from './mqtt/mqtt.module';
import { ClassroomModule } from './classroom/classroom.module';

@Module({
  imports: [AuthModule, StudentModule, TeacherModule, AttendanceModule, TimetableModule, RecommendationModule, RoutineModule, MqttModule, ClassroomModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
