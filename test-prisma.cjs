import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) return console.log("No users");
  const user = await prisma.user.findUnique({
    where: { id: users[0].id },
    include: {
      links: true,
      logs: { orderBy: { createdAt: 'desc' }, take: 50 },
      memberOfGroups: { select: { id: true, name: true, course: { select: { code: true } } } },
      enrollments: { select: { course: { select: { id: true, name: true, code: true } } } },
      clubMemberships: { select: { club: { select: { id: true, name: true } } } }
    }
  });
  console.log(user ? 'Success' : 'User not found');
}
test().catch(console.error).finally(() => prisma.$disconnect());
