import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash,
          studentEmail: email || null,
          name: username,
        }
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Auth: Me
  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: { id: true, username: true, name: true, studentEmail: true, bio: true, avatarUrl: true, bannerUrl: true, linkedinUrl: true, githubUrl: true, createdAt: true }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Auth: Update Profile
  app.put('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const { name, bio, avatarUrl, bannerUrl, linkedinUrl, githubUrl } = req.body;
      
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: { name, bio, avatarUrl, bannerUrl, linkedinUrl, githubUrl },
        select: { id: true, username: true, name: true, studentEmail: true, bio: true, avatarUrl: true, bannerUrl: true, linkedinUrl: true, githubUrl: true, createdAt: true }
      });
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Users: Get Public Profile
  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: req.params.username },
        select: { id: true, username: true, name: true, bio: true, avatarUrl: true, bannerUrl: true, linkedinUrl: true, githubUrl: true, createdAt: true }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
