import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function main() {
  const users = await prisma.user.findMany();
  let admin = users.find(u => u.role === 'ADMIN' || u.studentEmail === 'abdulazizalgassem4@gmail.com');
  if (!admin) {
     admin = users[0];
     await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' }});
  }
  const target = users.find(u => u.id !== admin!.id) || admin;
  
  if (!admin || !target) {
    console.log('Need at least 2 users (one admin)');
    return;
  }
  
  console.log('Admin:', admin.username);
  console.log('Target:', target.username);
  
  const token = jwt.sign({ userId: admin.id }, JWT_SECRET);
  
  const res = await fetch(`http://localhost:3000/api/admin/users/${target.id}/ban`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isBanned: !target.isBanned })
  });
  
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}

main();
