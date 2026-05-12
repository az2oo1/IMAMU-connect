import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if (!users.length) return console.log('no users');
  const user = users[0];
  try {
     const profile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          links: true,
          warnings: true,
          logs: { orderBy: { createdAt: 'desc' }, take: 50 },
          memberOfGroups: { select: { id: true, name: true, course: { select: { code: true } } } },
          enrollments: { select: { course: { select: { id: true, name: true, code: true } } } },
          clubMemberships: { select: { club: { select: { id: true, name: true } } } }
        }
      });
      console.log('SUCCESS');
  } catch (e) {
      console.log('ERROR:', e);
  }
}
main();
