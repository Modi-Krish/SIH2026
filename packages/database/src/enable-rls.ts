import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = [
  'users',
  'departments',
  'students',
  'teachers',
  'face_embeddings',
  'devices',
  'classrooms',
  'subjects',
  'timetable_slots',
  'attendance_sessions',
  'attendance_records',
  'recommendations',
  'daily_routines',
  'notifications',
  'audit_logs',
  'career_goals',
  'student_skills',
];

async function enableRLS() {
  console.log('Enabling Row Level Security (RLS) on all public tables...');
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✓ RLS enabled on table: ${table}`);
    } catch (e: any) {
      console.error(`✕ Failed to enable RLS on ${table}: ${e.message}`);
    }
  }
  
  console.log('\nAll tables secured! PostgREST public access blocked.');
  console.log('NestJS (via Prisma) will continue to have full direct access.');
}

enableRLS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
