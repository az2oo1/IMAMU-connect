import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const u = await prisma.user.findFirst();
    if (!u) {
      console.log('No users found.');
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: u.id },
      include: {
        links: true,
        warnings: true,
        logs: { orderBy: { createdAt: 'desc' }, take: 50 },
        memberOfGroups: { select: { id: true, name: true, course: { select: { code: true } } } },
        enrollments: { select: { course: { select: { id: true, name: true, code: true } } } },
        clubMemberships: { select: { club: { select: { id: true, name: true } } } }
      }
    });
    console.log(user ? 'User query succeeded' : 'User query returned null');
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
