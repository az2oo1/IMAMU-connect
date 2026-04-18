import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dms = await prisma.group.findMany({
    where: { isDirectMessage: true },
    include: { members: true, admins: true }
  });

  for (const dm of dms) {
    if (dm.admins.length === 0) {
      await prisma.group.update({
        where: { id: dm.id },
        data: { admins: { connect: dm.members.map(m => ({ id: m.id })) } }
      });
    }
  }
  console.log('Done');
}
main();
