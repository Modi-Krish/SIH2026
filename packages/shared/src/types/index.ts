// Placeholder for Types

export interface TimetableSlotInfo {
  id: string;
  subjectName: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  classroomName: string;
}

export interface RecommendationInfo {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedDuration?: number;
}
