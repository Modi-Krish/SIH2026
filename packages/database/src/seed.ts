import { PrismaClient, UserRole, DayOfWeek } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo dataset...');

  // 1. Clean DB in reverse dependency order
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.dailyRoutine.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.device.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.careerGoal.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  // 2. Departments
  const deptNames = ['Computer Science', 'Information Tech', 'Electronics'];
  const depts = [];
  for (const name of deptNames) {
    depts.push(await prisma.department.create({
      data: { name, code: name.substring(0, 3).toUpperCase() }
    }));
  }
  console.log(`Created ${depts.length} departments.`);

  // 3. Classrooms (25)
  const classrooms = [];
  for (let i = 1; i <= 25; i++) {
    classrooms.push(await prisma.classroom.create({
      data: {
        name: `Room ${100 + i}`,
        capacity: 60,
        floor: Math.ceil(i / 10)
      }
    }));
  }
  console.log(`Created ${classrooms.length} classrooms.`);

  // 4. Subjects
  const subjects = [];
  const subjNames = ['Data Structures', 'Operating Systems', 'Database Mgmt', 'Computer Networks', 'Machine Learning'];
  let codeIdx = 101;
  for (const name of subjNames) {
    subjects.push(await prisma.subject.create({
      data: {
        name,
        code: `CS${codeIdx++}`,
        departmentId: depts[0].id
      }
    }));
  }
  console.log(`Created ${subjects.length} subjects.`);

  // 5. Teachers (30)
  const teachers = [];
  for (let i = 1; i <= 30; i++) {
    const user = await prisma.user.create({
      data: {
        supabaseId: faker.string.uuid(),
        email: faker.internet.email({ provider: 'sapls.edu' }),
        collegeId: `TCH-${1000 + i}`,
        name: `Prof. ${faker.person.lastName()}`,
        role: UserRole.TEACHER,
      }
    });
    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        departmentId: depts[i % depts.length].id,
      }
    });
    teachers.push(teacher);
  }
  console.log(`Created ${teachers.length} teachers.`);

  // 6. Students (100) - scaled slightly for faster initial seeding speed
  const students = [];
  for (let i = 1; i <= 100; i++) {
    const user = await prisma.user.create({
      data: {
        supabaseId: faker.string.uuid(),
        email: faker.internet.email({ provider: 'sapls.edu' }),
        collegeId: `STU-2023-${String(i).padStart(4, '0')}`,
        name: faker.person.fullName(),
        role: UserRole.STUDENT,
      }
    });

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        departmentId: depts[i % depts.length].id,
        semester: 5,
        careerGoal: 'Software Engineer',
      }
    });

    // Assign 80% to active MAC device
    if (Math.random() > 0.2) {
      await prisma.device.create({
        data: {
          deviceToken: faker.string.uuid(),
          macAddress: faker.internet.mac().toUpperCase(),
          studentId: student.id,
        }
      });
    }

    students.push(student);
  }
  console.log(`Created ${students.length} students.`);

  // 7. Timetable Slots
  const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY];
  const timeSlots = [
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:30', end: '12:30' },
    { start: '14:00', end: '15:00' }
  ];

  for (const dept of depts) {
    for (const day of days) {
      for (const slot of timeSlots) {
        await prisma.timetableSlot.create({
          data: {
            departmentId: dept.id,
            semester: 5,
            subjectId: faker.helpers.arrayElement(subjects).id,
            teacherId: faker.helpers.arrayElement(teachers).id,
            classroomId: faker.helpers.arrayElement(classrooms).id,
            day: day,
            startTime: slot.start,
            endTime: slot.end,
          }
        });
      }
    }
  }
  console.log('Created Timetable with free periods.');

  // Create a real test account for demo
  const demoStudentUser = await prisma.user.create({
    data: {
      supabaseId: 'demo-student-id-123',
      email: 'student@sapls.edu',
      collegeId: 'DEMO-STU-001',
      name: 'Demo Student',
      role: UserRole.STUDENT,
    }
  });

  await prisma.student.create({
    data: {
      userId: demoStudentUser.id,
      departmentId: depts[0].id,
      semester: 5,
      careerGoal: 'Data Scientist'
    }
  });

  const demoTeacherUser = await prisma.user.create({
    data: {
      supabaseId: 'demo-teacher-id-123',
      email: 'teacher@sapls.edu',
      collegeId: 'DEMO-TCH-001',
      name: 'Demo Teacher',
      role: UserRole.TEACHER,
    }
  });

  await prisma.teacher.create({
    data: {
      userId: demoTeacherUser.id,
      departmentId: depts[0].id,
    }
  });

  console.log('Created DEMO accounts.');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
