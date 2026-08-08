// Placeholder for DTOs (Data Transfer Objects)
// These will be shared between Next.js and NestJS

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AttendanceCheckInDto {
  studentId: string;
  classroomId: string;
  deviceToken: string;
  faceEmbedding?: number[];
  faceConfidence?: number;
}
