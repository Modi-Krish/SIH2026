import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMac() {
  const targetMac = '02:17:D6:CD:26:D6';
  
  // Find demo student user
  let user = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { student: true }
  });

  if (!user || !user.student) {
    console.error('No student found in DB!');
    return;
  }

  console.log(`Linking MAC ${targetMac} to Student: ${user.name} (${user.collegeId})...`);

  // Upsert Device
  const device = await prisma.device.upsert({
    where: { id: user.student.id }, // dummy id search or just create
    create: {
      studentId: user.student.id,
      macAddress: targetMac,
      deviceToken: 'demo-mac-token-123',
      deviceName: 'Student Phone (Laptop Hotspot Client)',
      platform: 'android'
    },
    update: {
      macAddress: targetMac
    }
  }).catch(async () => {
    return prisma.device.create({
      data: {
        studentId: user.student.id,
        macAddress: targetMac,
        deviceToken: 'demo-mac-token-123',
        deviceName: 'Student Phone (Laptop Hotspot Client)',
        platform: 'android'
      }
    });
  });

  console.log(`Successfully registered MAC address ${device.macAddress} for ${user.name}!`);
}

addMac()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
