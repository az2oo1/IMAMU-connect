import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import archiver from 'archiver';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).userId;
    if (!userId) return cb(new Error('Unauthorized'), '');
    
    // Determine folder based on fieldname
    const folderType = file.fieldname === 'avatar' ? 'pfp' : 'background';
    const dir = path.join(process.cwd(), `uploads/users/${userId}/${folderType}`);
    
    try {
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // --- API ROUTES ---

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      const normalizedUsername = username.toLowerCase();
      
      const existingUser = await prisma.user.findUnique({ where: { username: normalizedUsername } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          username: normalizedUsername,
          passwordHash,
          studentEmail: email || null,
          name: username,
        },
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true }
      });

      // Create welcome notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SYSTEM',
          content: 'Welcome to CampusHub! Complete your profile to get started.',
          link: '/personal'
        }
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const normalizedUsername = username.toLowerCase();
      
      const user = await prisma.user.findFirst({ 
        where: { 
          OR: [
            { username: normalizedUsername },
            { studentEmail: normalizedUsername },
            { googleEmail: normalizedUsername }
          ]
        } 
      });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed: ' + (error as Error).message });
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
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Notifications: Get all
  app.get('/api/notifications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const notifications = await prisma.notification.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      res.json({ notifications });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Notifications: Mark all as read
  app.put('/api/notifications/read', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      await prisma.notification.updateMany({
        where: { userId: decoded.userId, read: false },
        data: { read: true }
      });
      
      res.json({ success: true });
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
      
      const { name, bio, links, studentEmail, googleEmail } = req.body;
      
      // Update basic fields
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (studentEmail !== undefined) updateData.studentEmail = studentEmail;
      if (googleEmail !== undefined) updateData.googleEmail = googleEmail;

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData,
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true }
      });

      // Update links if provided
      if (links && Array.isArray(links)) {
        await prisma.userLink.deleteMany({ where: { userId: decoded.userId } });
        if (links.length > 0) {
          await prisma.userLink.createMany({
            data: links.map((url: string) => ({ url, userId: decoded.userId }))
          });
        }
      }
      
      const updatedUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true }
      });

      res.json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Auth: Upload Image
  app.post('/api/auth/upload', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (req as any).userId = decoded.userId;

      upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }])(req, res, async (err) => {
        if (err) return res.status(500).json({ error: 'Upload failed' });

        try {
          const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
          const updateData: any = {};

          if (files && files.avatar && files.avatar[0]) {
            updateData.avatarUrl = `/uploads/users/${decoded.userId}/pfp/${files.avatar[0].filename}`;
          }
          if (files && files.banner && files.banner[0]) {
            updateData.bannerUrl = `/uploads/users/${decoded.userId}/background/${files.banner[0].filename}`;
          }

          if (Object.keys(updateData).length > 0) {
            const user = await prisma.user.update({
              where: { id: decoded.userId },
              data: updateData,
              select: { id: true, username: true, name: true, studentEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true }
            });
            return res.json({ user });
          }

          res.status(400).json({ error: 'No files uploaded' });
        } catch (innerError) {
          console.error('Error during upload processing:', innerError);
          res.status(500).json({ error: 'Failed to process upload' });
        }
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Users: Get Public Profile
  app.get('/api/users/:username', async (req, res) => {
    try {
      const normalizedUsername = req.params.username.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
        select: { id: true, username: true, name: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // --- ADMIN ROUTES ---
  
  // Middleware to check admin role
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Get all users
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, role: true, isBanned: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get specific user details
  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, role: true, isBanned: true, links: true }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // Update full user details
  app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const { username, name, studentEmail, googleEmail, bio, password, role, isBanned } = req.body;
      
      const updateData: any = {};
      if (username !== undefined) updateData.username = username.toLowerCase();
      if (name !== undefined) updateData.name = name;
      if (studentEmail !== undefined) updateData.studentEmail = studentEmail || null;
      if (googleEmail !== undefined) updateData.googleEmail = googleEmail || null;
      if (bio !== undefined) updateData.bio = bio;
      if (role !== undefined) updateData.role = role;
      if (isBanned !== undefined) updateData.isBanned = isBanned;
      
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: { id: true, username: true, name: true, role: true, isBanned: true }
      });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Update user role
  app.put('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, username: true, role: true }
      });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // Toggle user ban status
  app.put('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
    try {
      const { isBanned } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { isBanned },
        select: { id: true, username: true, isBanned: true }
      });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update ban status' });
    }
  });

  // --- ADMIN CLUBS ---
  app.get('/api/admin/clubs', requireAdmin, async (req, res) => {
    try {
      const clubs = await prisma.club.findMany({
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ clubs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/admin/clubs', requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const club = await prisma.club.create({
        data: { name, description }
      });
      res.json({ club });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create club' });
    }
  });

  app.delete('/api/admin/clubs/:id', requireAdmin, async (req, res) => {
    try {
      await prisma.club.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete club' });
    }
  });

  app.get('/api/admin/clubs/:id/members', requireAdmin, async (req, res) => {
    try {
      const members = await prisma.clubMember.findMany({
        where: { clubId: req.params.id },
        include: { user: { select: { id: true, username: true, name: true } } }
      });
      res.json({ members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch club members' });
    }
  });

  app.post('/api/admin/clubs/:id/members', requireAdmin, async (req, res) => {
    try {
      const { userId, isAdmin } = req.body;
      const member = await prisma.clubMember.create({
        data: { clubId: req.params.id, userId, isAdmin: isAdmin || false },
        include: { user: { select: { id: true, username: true, name: true } } }
      });
      res.json({ member });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add club member' });
    }
  });

  app.delete('/api/admin/clubs/:id/members/:userId', requireAdmin, async (req, res) => {
    try {
      await prisma.clubMember.delete({
        where: { userId_clubId: { clubId: req.params.id, userId: req.params.userId } }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove club member' });
    }
  });

  // --- ADMIN NEWS ---
  app.get('/api/admin/news', requireAdmin, async (req, res) => {
    try {
      const articles = await prisma.newsArticle.findMany({
        include: { author: { select: { username: true, name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch news articles' });
    }
  });

  app.delete('/api/admin/news/:id', requireAdmin, async (req, res) => {
    try {
      await prisma.newsArticle.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete news article' });
    }
  });

  // --- ADMIN REPORTS ---
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json({ reports });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  app.put('/api/admin/reports/:id', requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const report = await prisma.report.update({
        where: { id: req.params.id },
        data: { status }
      });
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update report status' });
    }
  });

  // Backup database and files
  app.get('/api/admin/backup', requireAdmin, (req, res) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `campushub-full-backup-${timestamp}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('error', (err) => {
      console.error('Backup archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate backup' });
      }
    });

    archive.pipe(res);

    // Append the database file
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'database/dev.db' });
    }

    // Append the uploads directory (contains all user files, academic files, news photos, etc.)
    const uploadsPath = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsPath)) {
      archive.directory(uploadsPath, 'uploads');
    }

    archive.finalize();
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

  // Seed default admin user
  try {
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          name: 'System Admin',
          passwordHash: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
