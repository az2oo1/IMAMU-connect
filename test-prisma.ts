import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.userLink.createMany({
      data: [{ url: 'http://test.com', userId: '123' }]
    });
    console.log('createMany works');
  } catch (e) {
    console.error(e);
  }
}
main();
