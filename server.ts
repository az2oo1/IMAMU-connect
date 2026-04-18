import express from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import archiver from 'archiver';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Map to store connected users: userId -> socketId
const connectedUsers = new Map<string, string>();

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string };
    
    // Check if user is banned or suspended
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    if (user.isBanned) {
      return res.status(403).json({ error: 'Your account has been permanently banned.' });
    }
    
    if (user.isSuspended && user.suspensionExpires && user.suspensionExpires > new Date()) {
      return res.status(403).json({ error: `Your account is suspended until ${user.suspensionExpires.toLocaleDateString()}.` });
    }

    req.user = { 
      id: decoded.userId,
      userId: decoded.userId,
      role: (user.studentEmail === 'abdulazizalgassem4@gmail.com' || user.googleEmail === 'abdulazizalgassem4@gmail.com') ? 'ADMIN' : user.role,
      name: user.name, 
      username: user.username 
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Configure Multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = (req as any).user;
    if (!user) return cb(new Error('Unauthorized'), '');
    
    // Determine folder based on fieldname or query param
    let dir = path.join(process.cwd(), `uploads/general`);
    if (req.query.type === 'user') {
      dir = path.join(process.cwd(), `uploads/users/${user.userId}`);
    } else if (req.query.type === 'club') {
      dir = path.join(process.cwd(), `uploads/clubs/${req.query.id}`);
    } else if (req.query.type === 'course') {
      dir = path.join(process.cwd(), `uploads/courses/${req.query.id}`);
    } else if (req.query.type === 'group') {
      dir = path.join(process.cwd(), `uploads/groups/${req.query.id}`);
    }
    
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

  // Request logger middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Authenticate socket connection
    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        connectedUsers.set(decoded.userId, socket.id);
        socket.data.userId = decoded.userId;
        console.log(`User ${decoded.userId} authenticated on socket ${socket.id}`);
      } catch (error) {
        console.error('Socket authentication failed:', error);
      }
    });

    // Join a group room
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
      console.log(`Socket ${socket.id} joined group_${groupId}`);
    });

    // Leave a group room
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`);
      console.log(`Socket ${socket.id} left group_${groupId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.data.userId) {
        // Only remove if this socket is the one currently mapped to the user
        if (connectedUsers.get(socket.data.userId) === socket.id) {
          connectedUsers.delete(socket.data.userId);
        }
      }
    });
  });

  // Make io available to routes
  app.set('io', io);

  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // File Upload
  app.post('/api/upload', authenticateToken, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(500).json({ error: 'File upload failed due to server error.' });
      }
      next();
    });
  }, (req: any, res) => {
    if (!req.file) {
      console.error('No file was present in req.file');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the URL to access the file
    // Get relative path from process.cwd() + '/uploads'
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const relativePath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
    const url = `/uploads/${relativePath}`;
    
    console.log(`File uploaded successfully to: ${req.file.path}, generated URL: ${url}`);
    res.json({ url });
  });

  // File Download Proxy
  app.get('/api/download', (req, res) => {
    const { url, filename } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    // Ensure the path is relative and within uploads
    const relativeUrl = (url as string).startsWith('/') ? (url as string).substring(1) : url;
    const filePath = path.join(process.cwd(), relativeUrl as string);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File NOT found at: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Validate that the path is inside the uploads directory for security
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.download(filePath, filename as string || path.basename(filePath), (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      }
    });
  });

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
          role: (email === 'abdulazizalgassem4@gmail.com' || username === 'admin') ? 'ADMIN' : 'USER'
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

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
      
      await prisma.log.create({
        data: { userId: user.id, action: 'User Registered', details: `Registered with username ${username}` }
      });

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

      // Auto-promote specific user
      if (user.studentEmail === 'abdulazizalgassem4@gmail.com' || user.googleEmail === 'abdulazizalgassem4@gmail.com') {
        if (user.role !== 'ADMIN') {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
          user.role = 'ADMIN';
        }
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
      
      await prisma.log.create({
        data: { userId: user.id, action: 'User Logged In', details: 'Successful login' }
      });

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

      // Auto-promote specific user
      if (user.studentEmail === 'abdulazizalgassem4@gmail.com' || user.googleEmail === 'abdulazizalgassem4@gmail.com') {
        if (user.role !== 'ADMIN') {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
          user.role = 'ADMIN';
        }
      }

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
  app.post('/api/auth/upload', authenticateToken, async (req: any, res) => {
    try {
      // Set query type so multer knows where to put it
      req.query.type = 'user';

      upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'banner', maxCount: 1 }])(req, res, async (err) => {
        if (err) return res.status(500).json({ error: 'Upload failed' });

        try {
          const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
          const updateData: any = {};

          if (files && files.avatar && files.avatar[0]) {
            updateData.avatarUrl = `/uploads/users/${req.user.userId}/${files.avatar[0].filename}`;
          }
          if (files && files.banner && files.banner[0]) {
            updateData.bannerUrl = `/uploads/users/${req.user.userId}/${files.banner[0].filename}`;
          }

          if (Object.keys(updateData).length > 0) {
            const user = await prisma.user.update({
              where: { id: req.user.userId },
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

  // --- PUBLIC CLUBS ---
  app.get('/api/clubs', async (req, res) => {
    try {
      const clubs = await prisma.club.findMany({
        include: { 
          _count: { select: { members: true } },
          links: true,
          articles: {
            take: 3,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ clubs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.get('/api/clubs/:id', async (req, res) => {
    try {
      const club = await prisma.club.findUnique({
        where: { id: req.params.id },
        include: { 
          _count: { select: { members: true } },
          links: true,
          articles: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      if (!club) return res.status(404).json({ error: 'Club not found' });
      res.json({ club });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch club' });
    }
  });

  // --- CLUB MANAGEMENT (FOR CLUB ADMINS) ---
  app.get('/api/clubs/:id/role', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: {
            userId: req.user.userId,
            clubId: req.params.id
          }
        }
      });
      res.json({ 
        isMember: !!membership, 
        isAdmin: membership?.isAdmin || false 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  });

  app.put('/api/clubs/:id', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to manage this club' });
      }

      const { name, description, avatarUrl, bannerUrl, tags, links } = req.body;

      const updatedClub = await prisma.club.update({
        where: { id: req.params.id },
        data: {
          name,
          description,
          avatarUrl,
          bannerUrl,
          tags,
          links: {
            deleteMany: {},
            create: links?.map((url: string) => ({ url })) || []
          }
        }
      });

      res.json({ club: updatedClub });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update club' });
    }
  });

  app.post('/api/clubs/:id/articles', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to post news for this club' });
      }

      const { title, content, imageUrl, photoUrl } = req.body;

      const article = await prisma.newsArticle.create({
        data: {
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
          title,
          content,
          photoUrl: photoUrl || imageUrl,
          authorId: req.user.userId,
          clubId: req.params.id
        }
      });

      res.json({ article });
    } catch (error) {
      res.status(500).json({ error: 'Failed to post article' });
    }
  });

  app.delete('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete news for this club' });
      }

      await prisma.newsArticle.delete({
        where: { id: req.params.articleId }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete article' });
    }
  });

  app.get('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to view members for this club' });
      }

      const members = await prisma.clubMember.findMany({
        where: { clubId: req.params.id },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true }
          }
        }
      });

      res.json({ members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  app.delete('/api/clubs/:id/members/:userId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to remove members from this club' });
      }

      await prisma.clubMember.delete({
        where: { userId_clubId: { userId: req.params.userId, clubId: req.params.id } }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  app.put('/api/clubs/:id/members/:userId/role', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to change member roles' });
      }

      const { isAdmin } = req.body;

      await prisma.clubMember.update({
        where: { userId_clubId: { userId: req.params.userId, clubId: req.params.id } },
        data: { isAdmin }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update member role' });
    }
  });

  // --- PUBLIC GROUPS / COURSES ---
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        include: {
          _count: { select: { enrollments: true } }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  });

  app.get('/api/my-courses', authenticateToken, async (req: any, res) => {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: req.user.userId },
        include: {
          course: {
            include: {
              _count: { select: { enrollments: true } }
            }
          }
        }
      });
      res.json({ courses: enrollments.map((e: any) => ({ ...e.course, isAdmin: e.isAdmin || req.user.role === 'ADMIN' })) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch your courses' });
    }
  });

  app.post('/api/courses/:id/enroll', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const existing = await prisma.enrollment.findFirst({
        where: { userId: req.user.userId, courseId, semester: 'Current' }
      });
      if (existing) {
        return res.status(400).json({ error: 'Already enrolled' });
      }
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: req.user.userId,
          courseId,
          semester: 'Current',
          isAdmin: false
        }
      });
      
      // Auto-join related groups
      const groups = await prisma.group.findMany({ where: { courseId } });
      for (const group of groups) {
        await prisma.group.update({
          where: { id: group.id },
          data: { members: { connect: { id: req.user.userId } } }
        });
      }

      res.json({ enrollment });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enroll in course' });
    }
  });

  app.post('/api/courses/:id/unenroll', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      await prisma.enrollment.deleteMany({
        where: { userId: req.user.userId, courseId }
      });

      // Auto-leave related groups
      const groups = await prisma.group.findMany({ where: { courseId } });
      for (const group of groups) {
        await prisma.group.update({
          where: { id: group.id },
          data: { members: { disconnect: { id: req.user.userId } } }
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unenroll from course' });
    }
  });

  app.post('/api/courses/:id/files', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const { name, url, folderId, isAnonymous } = req.body;
      
      // Check if user is admin of the course
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });
      
      const isAdmin = enrollment?.isAdmin || req.user.role === 'ADMIN';
      const status = isAdmin ? 'APPROVED' : 'PENDING';

      const file = await prisma.academicFile.create({
        data: {
          name,
          url,
          courseId,
          folderId: folderId || null,
          status,
          uploaderId: req.user.userId,
          isAnonymous: isAnonymous === true,
          approverId: isAdmin ? req.user.userId : null
        }
      });
      res.json({ file });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save file record' });
    }
  });

  app.get('/api/courses/:id/folders', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const folders = await prisma.folder.findMany({
        where: { courseId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
      });
      res.json({ folders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  });

  app.post('/api/courses/:id/folders', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const { name, parentId } = req.body;
      
      // Check if user is admin of the course
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });
      
      if (!enrollment?.isAdmin && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can create folders' });
      }

      const folder = await prisma.folder.create({
        data: {
          name,
          courseId,
          parentId: parentId || null
        }
      });
      res.json({ folder });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  app.get('/api/courses/:id/files', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      
      // Check if user is admin of the course
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });
      
      const isAdmin = enrollment?.isAdmin || req.user.role === 'ADMIN';

      // Admins see all files (APPROVED and PENDING), regular users only see APPROVED
      const whereClause = isAdmin 
        ? { courseId } 
        : { courseId, status: 'APPROVED' };

      const files = await prisma.academicFile.findMany({
        where: whereClause,
        include: { 
          uploader: { select: { id: true, name: true, username: true } },
          approver: { select: { id: true, name: true, username: true } }
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
      });
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.put('/api/courses/:id/reorder', authenticateToken, async (req: any, res) => {
    try {
      const { items } = req.body; // array of { id, type: 'folder'|'file', order, folderId }
      
      const courseId = req.params.id;
      
      // Check if user is admin or course owner
      const isGlobalAdmin = req.user.role === 'ADMIN';
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });
      
      if (!isGlobalAdmin && !enrollment?.isAdmin) {
        return res.status(403).json({ error: 'Only admins can reorder files' });
      }
      
      // We will perform updates in a transaction for atomicity
      const queries = items.map((item: any) => {
        if (item.type === 'folder') {
          return prisma.folder.update({
            where: { id: item.id },
            data: { order: item.order }
          });
        } else {
          return prisma.academicFile.update({
            where: { id: item.id },
            data: { 
              order: item.order, 
              folderId: item.folderId !== undefined ? (item.folderId === 'null' ? null : item.folderId) : undefined 
            }
          });
        }
      });

      await prisma.$transaction(queries);
      res.json({ success: true });
    } catch (error) {
      console.error('Reorder error:', error);
      res.status(500).json({ error: 'Failed to reorder items' });
    }
  });

  app.patch('/api/files/:id/approve', authenticateToken, async (req: any, res) => {
    try {
      const fileId = req.params.id;
      const file = await prisma.academicFile.findUnique({ where: { id: fileId } });
      
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Check if user is admin of the course
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId: file.courseId, userId: req.user.userId }
      });

      if (!enrollment?.isAdmin && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can approve files' });
      }

      const updatedFile = await prisma.academicFile.update({
        where: { id: fileId },
        data: { status: 'APPROVED', approverId: req.user.userId }
      });

      // Log the action
      await prisma.log.create({
        data: {
          userId: req.user.userId,
          action: 'File Approved',
          details: `Approved academic file: ${file.name}`
        }
      });

      res.json({ file: updatedFile });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve file' });
    }
  });

  app.get('/api/files/:id', authenticateToken, async (req: any, res) => {
    try {
      const file = await prisma.academicFile.findUnique({
        where: { id: req.params.id },
        include: {
          uploader: { select: { name: true, username: true, avatarUrl: true } },
          course: { select: { id: true, name: true, code: true } }
        }
      });
      if (!file) return res.status(404).json({ error: 'File not found' });
      res.json({ file });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });

  app.delete('/api/files/:id', authenticateToken, async (req: any, res) => {
    try {
      const fileId = req.params.id;
      const file = await prisma.academicFile.findUnique({ where: { id: fileId } });
      
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Check if user is admin of the course
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId: file.courseId, userId: req.user.userId }
      });

      if (!enrollment?.isAdmin && file.uploaderId !== req.user.userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this file' });
      }

      await prisma.academicFile.delete({
        where: { id: fileId }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  app.get('/api/groups', async (req, res) => {
    try {
      const groups = await prisma.group.findMany({
        where: { isDirectMessage: false },
        include: {
          course: true,
          _count: { select: { members: true } }
        },
        orderBy: { name: 'asc' }
      });
      res.json({ groups });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  });

  app.get('/api/my-groups', authenticateToken, async (req: any, res) => {
    try {
      // 1. Fetch DMs (with members to display contact names)
      const dms = await prisma.group.findMany({
        where: {
          isDirectMessage: true,
          members: { some: { id: req.user.userId } }
        },
        include: {
          course: true,
          _count: { select: { members: true } },
          members: {
            select: { id: true, name: true, username: true, avatarUrl: true }
          }
        }
      });

      // 2. Fetch regular groups without the massive members payload
      const regularGroups = await prisma.group.findMany({
        where: {
          isDirectMessage: false,
          members: { some: { id: req.user.userId } }
        },
        include: {
          course: true,
          _count: { select: { members: true } }
        }
      });

      const groups = [...dms, ...regularGroups].sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({ groups });
    } catch (error) {
      console.error('Failed to fetch your groups', error);
      res.status(500).json({ error: 'Failed to fetch your groups' });
    }
  });

  app.post('/api/dms/start', authenticateToken, async (req: any, res) => {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user.userId;

      if (targetUserId === currentUserId) {
        return res.status(400).json({ error: 'Cannot DM yourself' });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });

      if (!targetUser || !currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if a DM group already exists between these two users
      const existingGroup = await prisma.group.findFirst({
        where: {
          isDirectMessage: true,
          AND: [
            { admins: { some: { id: currentUserId } } },
            { admins: { some: { id: targetUserId } } }
          ]
        }
      });

      if (existingGroup) {
        // Ensure both users are in members (in case one deleted the chat)
        await prisma.group.update({
          where: { id: existingGroup.id },
          data: { members: { connect: [{ id: currentUserId }, { id: targetUserId }] } }
        });
        return res.json({ group: existingGroup });
      }

      // Create new DM group
      const newGroup = await prisma.group.create({
        data: {
          name: `${currentUser.name || currentUser.username} & ${targetUser.name || targetUser.username}`,
          isDirectMessage: true,
          admins: {
            connect: [{ id: currentUserId }, { id: targetUserId }]
          },
          members: {
            connect: [{ id: currentUserId }, { id: targetUserId }]
          }
        }
      });

      res.json({ group: newGroup });
    } catch (error) {
      console.error('Failed to start DM', error);
      res.status(500).json({ error: 'Failed to start DM' });
    }
  });

  app.delete('/api/dms/:id', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      
      const group = await prisma.group.findFirst({
        where: { id: groupId, isDirectMessage: true, members: { some: { id: req.user.userId } } }
      });

      if (!group) return res.status(404).json({ error: 'DM not found' });

      // Delete chat for me only:
      // 1. Mark all current messages as deleted by me
      const messages = await prisma.message.findMany({ where: { groupId } });
      for (const msg of messages) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { deletedBy: { connect: { id: req.user.userId } } }
        });
      }

      // 2. Disconnect me from the group members so it disappears from my sidebar
      await prisma.group.update({
        where: { id: groupId },
        data: { members: { disconnect: { id: req.user.userId } } }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete DM', error);
      res.status(500).json({ error: 'Failed to delete DM' });
    }
  });

  app.post('/api/groups', authenticateToken, async (req: any, res) => {
    try {
      const { name, description, tags, courseId } = req.body;
      const group = await prisma.group.create({
        data: {
          name,
          bio: description,
          tags,
          courseId,
          admins: { connect: { id: req.user.userId } },
          members: { connect: { id: req.user.userId } }
        },
        include: {
          course: true,
          _count: { select: { members: true } }
        }
      });
      res.json({ group });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create group' });
    }
  });

  app.patch('/api/groups/:id', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const { avatarUrl } = req.body;
      
      let group;
      if (req.user.role === 'ADMIN') {
        group = await prisma.group.findUnique({ where: { id: groupId } });
      } else {
        group = await prisma.group.findFirst({
          where: { id: groupId, admins: { some: { id: req.user.userId } } }
        });
      }
      
      if (!group) return res.status(403).json({ error: 'Not authorized to edit this group' });

      const updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: { avatarUrl }
      });

      res.json({ group: updatedGroup });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update group' });
    }
  });

  app.get('/api/groups/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          course: {
            include: {
              enrollments: {
                where: { isAdmin: true },
                select: { userId: true }
              }
            }
          },
          members: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            }
          },
          admins: {
            select: {
              id: true
            }
          }
        }
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const adminIds = new Set(group.admins.map(a => a.id));
      if (group.course) {
        group.course.enrollments.forEach(e => adminIds.add(e.userId));
      }

      const membersWithRoles = group.members.map(member => ({
        ...member,
        role: adminIds.has(member.id) ? 'admin' : 'member'
      }));

      res.json({ members: membersWithRoles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch group members' });
    }
  });

  app.post('/api/groups/:id/join', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const group = await prisma.group.update({
        where: { id: groupId },
        data: {
          members: { connect: { id: req.user.userId } }
        },
        include: {
          course: true,
          _count: { select: { members: true } }
        }
      });

      // Auto-enroll in related course
      if (group.courseId) {
        const existing = await prisma.enrollment.findFirst({
          where: { userId: req.user.userId, courseId: group.courseId }
        });
        if (!existing) {
          await prisma.enrollment.create({
            data: { userId: req.user.userId, courseId: group.courseId, semester: 'Current', isAdmin: false }
          });
          await prisma.log.create({
            data: { userId: req.user.userId, action: 'Enrolled in Course', details: `Auto-enrolled in course ${group.courseId} via group join` }
          });
        }
      }

      await prisma.log.create({
        data: { userId: req.user.userId, action: 'Joined Group', details: `Joined group ${group.name}` }
      });

      res.json({ group });
    } catch (error) {
      res.status(500).json({ error: 'Failed to join group' });
    }
  });

  app.post('/api/groups/:id/leave', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const group = await prisma.group.findUnique({ where: { id: groupId } });

      await prisma.group.update({
        where: { id: groupId },
        data: {
          members: { disconnect: { id: req.user.userId } }
        }
      });

      // Auto-unenroll from related course
      if (group?.courseId) {
        await prisma.enrollment.deleteMany({
          where: { userId: req.user.userId, courseId: group.courseId }
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to leave group' });
    }
  });

  // Group Messages
  app.get('/api/groups/:id/messages', authenticateToken, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const { limit = 100, cursor } = req.query;
      const take = parseInt(limit as string, 10);

      // Ensure user is member
      const group = await prisma.group.findFirst({
        where: { id: groupId, members: { some: { id: req.user.userId } } }
      });
      if (!group) return res.status(403).json({ error: 'Not a member of this group' });

      const messages = await prisma.message.findMany({
        where: { groupId },
        take: take,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor as string } : undefined,
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
          replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
          deletedBy: { select: { id: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Reverse to get chronological order
      messages.reverse();

      // Filter out messages deleted for this user
      const filteredMessages = messages.map(msg => {
        const deletedForMe = msg.deletedBy.some(u => u.id === req.user.userId);
        return {
          ...msg,
          deletedForMe,
          content: msg.deletedForAll ? 'This message was deleted' : msg.content
        };
      });

      res.json({ 
        messages: filteredMessages,
        nextCursor: messages.length > 0 ? messages[0].id : null,
        hasMore: messages.length === take
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/groups/:id/messages', authenticateToken, async (req: any, res) => {
    req.query.type = 'group';
    req.query.id = req.params.id;

    upload.single('attachment')(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      try {
        const groupId = req.params.id;
        const { content, replyToId } = req.body;
        
        const group = await prisma.group.findFirst({
          where: { id: groupId, members: { some: { id: req.user.userId } } },
          include: { admins: true }
        });
        if (!group) return res.status(403).json({ error: 'Not a member of this group' });

        // If it's a DM, ensure both users are in the members list (in case the other user deleted the chat)
        if (group.isDirectMessage && group.admins.length === 2) {
          await prisma.group.update({
            where: { id: groupId },
            data: { members: { connect: group.admins.map(a => ({ id: a.id })) } }
          });
        }

        const data: any = {
          content: content || '',
          groupId,
          authorId: req.user.userId,
          replyToId: replyToId || null
        };

        if (req.file) {
          data.attachmentUrl = `/uploads/groups/${groupId}/${req.file.filename}`;
          // Multer parses headers as latin1 by default, causing gibberish for UTF-8 filenames (like Arabic)
          data.attachmentName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
          data.attachmentSize = req.file.size;
          data.attachmentType = req.file.mimetype;
        }

        const message = await prisma.message.create({
          data,
          include: {
            author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
            replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
            deletedBy: { select: { id: true } }
          }
        });

        const io = req.app.get('io');
        if (io) {
          io.to(`group_${groupId}`).emit('new_message', { message: { ...message, deletedForMe: false } });
        }

        // Parse mentions and create notifications
        if (content) {
          const mentionRegex = /@(\w+)/g;
          const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);
          if (mentions.length > 0) {
            const mentionedUsers = await prisma.user.findMany({
              where: { username: { in: mentions } }
            });

            for (const mentionedUser of mentionedUsers) {
              if (mentionedUser.id !== req.user.userId) {
                const notification = await prisma.notification.create({
                  data: {
                    userId: mentionedUser.id,
                    type: 'MENTION',
                    content: `${message.author.name || message.author.username} mentioned you in ${group.name}`,
                    link: `/groups?id=${group.id}`
                  }
                });
                
                if (io) {
                  const targetSocketId = connectedUsers.get(mentionedUser.id);
                  if (targetSocketId) {
                    io.to(targetSocketId).emit('new_notification', notification);
                  }
                }
              }
            }
          }
        }

        if (group.isDirectMessage) {
          const otherMembers = await prisma.user.findMany({
            where: { memberOfGroups: { some: { id: groupId } }, id: { not: req.user.userId } }
          });
          for (const member of otherMembers) {
            const notification = await prisma.notification.create({
              data: {
                userId: member.id,
                type: 'MESSAGE',
                content: `New message from ${message.author.name || message.author.username}`,
                link: `/groups?id=${group.id}`
              }
            });
            
            if (io) {
              const targetSocketId = connectedUsers.get(member.id);
              if (targetSocketId) {
                io.to(targetSocketId).emit('new_notification', notification);
              }
            }
          }
        }

        res.json({ message: { ...message, deletedForMe: false } });
      } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
      }
    });
  });

  app.delete('/api/groups/:id/messages/:messageId', authenticateToken, async (req: any, res) => {
    try {
      const { id: groupId, messageId } = req.params;
      const { deleteForAll } = req.query;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { author: true, group: { include: { admins: true } } }
      });

      if (!message) return res.status(404).json({ error: 'Message not found' });

      const isAdmin = message.group.admins.some(a => a.id === req.user.userId) || req.user.role === 'ADMIN';
      const isAuthor = message.authorId === req.user.userId;

      if (deleteForAll === 'true' && (isAdmin || isAuthor)) {
        await prisma.message.update({
          where: { id: messageId },
          data: { deletedForAll: true }
        });
        const io = req.app.get('io');
        if (io) {
          io.to(`group_${groupId}`).emit('message_deleted', { messageId, deletedForAll: true });
        }
      } else {
        await prisma.message.update({
          where: { id: messageId },
          data: { deletedBy: { connect: { id: req.user.userId } } }
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // --- ADMIN ROUTES ---
  
  // Middleware to check admin role
  const requireAdmin = async (req: any, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || (user.role !== 'ADMIN' && user.studentEmail !== 'abdulazizalgassem4@gmail.com' && user.googleEmail !== 'abdulazizalgassem4@gmail.com')) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      req.user = { 
        id: user.id, 
        userId: user.id, 
        role: (user.studentEmail === 'abdulazizalgassem4@gmail.com' || user.googleEmail === 'abdulazizalgassem4@gmail.com') ? 'ADMIN' : user.role, 
        name: user.name, 
        username: user.username,
        email: user.studentEmail || user.googleEmail
      };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Admin: Get course users
  app.get('/api/admin/courses/:id/users', requireAdmin, async (req, res) => {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: req.params.id },
        include: {
          user: {
            select: { id: true, username: true, name: true, studentEmail: true, avatarUrl: true, role: true }
          }
        }
      });
      res.json({ users: enrollments.map(e => e.user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch course users' });
    }
  });

  // Admin: Get detailed user profile
  app.get('/api/admin/users/:id/profile', requireAdmin, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: {
          links: true,
          logs: { orderBy: { createdAt: 'desc' }, take: 50 },
          memberOfGroups: { select: { id: true, name: true, course: { select: { code: true } } } },
          enrollments: { select: { course: { select: { id: true, name: true, code: true } } } },
          clubMemberships: { select: { club: { select: { id: true, name: true } } } }
        }
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      const reportsMade = await prisma.report.findMany({ where: { reporterId: user.id } });
      const reportsReceived = await prisma.report.findMany({ where: { reportedId: user.id } });

      res.json({ user, reportsMade, reportsReceived });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

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
  app.put('/api/admin/users/:id/ban', requireAdmin, async (req: any, res) => {
    try {
      const { isBanned } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { isBanned },
        select: { id: true, username: true, isBanned: true }
      });
      
      // Log it
      await prisma.log.create({
        data: {
          action: isBanned ? 'System Ban Applied' : 'System Ban Removed',
          userId: req.params.id,
          details: `Action performed by admin ${req.user.username}`
        }
      });
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update ban status' });
    }
  });

  // Warn user
  app.post('/api/admin/users/:id/warn', requireAdmin, async (req: any, res) => {
    try {
      const { reason } = req.body;
      
      await prisma.log.create({
        data: {
          action: 'Official System Warning',
          userId: req.params.id,
          details: `Warning issued by admin ${req.user.username}. Reason: ${reason}`
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to log warning' });
    }
  });

  // --- ADMIN CLUBS ---
  // Courses Management
  app.get('/api/admin/courses', requireAdmin, async (req, res) => {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { name: 'asc' }
      });
      res.json({ courses });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  });

  app.post('/api/admin/courses', requireAdmin, async (req, res) => {
    try {
      const { name, code, tags, description, avatarUrl, bannerUrl } = req.body;
      const course = await prisma.course.create({
        data: { name, code, tags, description, avatarUrl, bannerUrl }
      });
      
      // Auto-create a group for this course
      await prisma.group.create({
        data: {
          name: `${code} - ${name}`,
          bio: description || `Official group for ${name}`,
          tags: tags,
          courseId: course.id,
          // Connect the admin who created it as the first admin/member
          admins: { connect: { id: (req as any).user.userId } },
          members: { connect: { id: (req as any).user.userId } }
        }
      });

      res.json({ course });
    } catch (error) {
      console.error('Failed to create course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  });

  app.put('/api/admin/courses/:id', requireAdmin, async (req, res) => {
    try {
      const { name, code, tags, description, avatarUrl, bannerUrl } = req.body;
      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: { name, code, tags, description, avatarUrl, bannerUrl }
      });
      res.json({ course });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  app.delete('/api/admin/courses/:id', requireAdmin, async (req, res) => {
    try {
      await prisma.course.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete course' });
    }
  });

  app.get('/api/admin/courses/:id/members', requireAdmin, async (req, res) => {
    try {
      const members = await prisma.enrollment.findMany({
        where: { courseId: req.params.id },
        include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } }
      });
      res.json({ members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch course members' });
    }
  });

  app.put('/api/admin/courses/:id/members/:userId/role', requireAdmin, async (req, res) => {
    try {
      const { isAdmin } = req.body;
      await prisma.enrollment.updateMany({
        where: { courseId: req.params.id, userId: req.params.userId },
        data: { isAdmin }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course member role' });
    }
  });

  app.get('/api/admin/clubs', requireAdmin, async (req, res) => {
    try {
      const clubs = await prisma.club.findMany({
        include: { 
          _count: { select: { members: true } },
          links: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ clubs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/admin/clubs', requireAdmin, async (req, res) => {
    try {
      const { name, description, tags } = req.body;
      const club = await prisma.club.create({
        data: { name, description, tags }
      });
      res.json({ club });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create club' });
    }
  });

  app.put('/api/admin/clubs/:id', requireAdmin, async (req, res) => {
    try {
      const { name, description, avatarUrl, bannerUrl, tags, links, adminId } = req.body;
      
      const club = await prisma.club.update({
        where: { id: req.params.id },
        data: { name, description, avatarUrl, bannerUrl, tags }
      });

      if (links && Array.isArray(links)) {
        await prisma.clubLink.deleteMany({ where: { clubId: req.params.id } });
        if (links.length > 0) {
          await prisma.clubLink.createMany({
            data: links.map((url: string) => ({ url, clubId: req.params.id }))
          });
        }
      }

      if (adminId) {
        // Remove existing admin
        await prisma.clubMember.updateMany({
          where: { clubId: req.params.id, isAdmin: true },
          data: { isAdmin: false }
        });
        
        // Check if user is already a member
        const existingMember = await prisma.clubMember.findUnique({
          where: { userId_clubId: { userId: adminId, clubId: req.params.id } }
        });

        if (existingMember) {
          await prisma.clubMember.update({
            where: { id: existingMember.id },
            data: { isAdmin: true }
          });
        } else {
          await prisma.clubMember.create({
            data: { userId: adminId, clubId: req.params.id, isAdmin: true }
          });
        }
      }

      res.json({ club });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update club' });
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

  app.get('/api/admin/clubs/:id/articles', requireAdmin, async (req, res) => {
    try {
      const articles = await prisma.newsArticle.findMany({
        where: { clubId: req.params.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch club articles' });
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

  // --- REPORTS ---
  app.post('/api/reports', authenticateToken, async (req: any, res) => {
    try {
      const { reportedId, type, contentId, reason } = req.body;
      const report = await prisma.report.create({
        data: {
          reporterId: req.user.userId,
          reportedId,
          type,
          contentId,
          reason
        }
      });

      // Log the activity
      await prisma.log.create({
        data: {
          userId: req.user.userId,
          action: 'Filed Report',
          details: `Reported ${type}#${contentId?.slice(0, 8)} [Reason: ${reason}]`
        }
      });

      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  // --- ADMIN REPORTS ---
  app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
      const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { name: true, username: true, avatarUrl: true }
          },
          adminNoteAuthor: {
            select: { name: true, username: true, avatarUrl: true }
          }
        }
      });
      
      // Enrich reports with content details
      const enrichedReports = await Promise.all(reports.map(async (r) => {
        let contentDetailsStr = `ID: ${r.contentId}`;
        let contentLink: string | null = null;
        let fileDetails = null;

        try {
          if (r.type === 'FILE' && r.contentId) {
            const file = await prisma.academicFile.findUnique({ 
              where: { id: r.contentId },
              include: { 
                uploader: { select: { username: true, name: true, avatarUrl: true } }, 
                approver: { select: { username: true, name: true, avatarUrl: true } } 
              }
            });
            if (file) {
               contentDetailsStr = file.name;
               contentLink = file.url;
               fileDetails = {
                 uploader: file.uploader,
                 approver: file.approver,
                 isAnonymous: file.isAnonymous
               };
            }
          } else if (r.type === 'NEWS' && r.contentId) {
            const news = await prisma.newsArticle.findUnique({ where: { id: r.contentId } });
            if (news) {
               contentDetailsStr = news.title;
               contentLink = `/news/${news.slug}`;
            }
          } else if (r.type === 'CLUB' && r.contentId) {
            const club = await prisma.club.findUnique({ where: { id: r.contentId } });
            if (club) {
               contentDetailsStr = club.name;
               contentLink = `/clubs/${club.id}`;
            }
          } else if (r.type === 'USER' && r.reportedId) {
            const user = await prisma.user.findUnique({ where: { id: r.reportedId } });
            if (user) {
               contentDetailsStr = `${user.name || user.username} (@${user.username})`;
               contentLink = `/profile/${user.username}`;
            }
          } else if (r.type === 'MESSAGE' && r.contentId) {
            const msg = await prisma.message.findUnique({ 
              where: { id: r.contentId },
              include: { author: { select: { name: true, username: true } } }
            });
            if (msg) {
              contentDetailsStr = `"${msg.content}" - ${msg.author.name || msg.author.username}`;
              contentLink = `/messages?id=${msg.groupId}`;
            }
          }
        } catch (e) {
          console.error("Error fetching report content details", e);
        }

        return {
          ...r,
          contentDetails: contentDetailsStr,
          contentLink,
          fileDetails
        };
      }));

      res.json({ reports: enrichedReports });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  app.put('/api/admin/reports/:id', requireAdmin, async (req: any, res) => {
    try {
      const { status, adminNote, resolutionMessage } = req.body;
      const dataToUpdate: any = {};
      if (status !== undefined) dataToUpdate.status = status;
      if (adminNote !== undefined) {
        dataToUpdate.adminNote = adminNote;
        dataToUpdate.adminNoteAuthorId = req.user.userId;
      }
      if (resolutionMessage !== undefined) {
        dataToUpdate.resolutionMessage = resolutionMessage;
      }

      if (status === 'RESOLVED' || status === 'DISMISSED') {
        dataToUpdate.resolvedAt = new Date();
      }

      const report = await prisma.report.update({
        where: { id: req.params.id },
        data: dataToUpdate,
        include: { reporter: true }
      });

      // Send notification if status changed to final
      if (status === 'RESOLVED' || status === 'DISMISSED') {
        await prisma.notification.create({
          data: {
            userId: report.reporterId,
            type: 'REPORT_ANSWER',
            content: `Your report regarding ${report.type} has been ${status.toLowerCase()}. Check the resolution message.`,
            link: `/reports/${report.id}`
          }
        });
      }

      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  // Start support chat for a report
  app.post('/api/admin/reports/:id/chat', requireAdmin, async (req: any, res) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
        include: { reporter: true }
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      // Find or create a group for this specific report between the Admin and the Reporter
      const groupName = `Support: Report #${report.id.slice(0, 8)}`;
      
      let group = await prisma.group.findFirst({
        where: {
          name: groupName,
          members: {
            some: { id: report.reporterId }
          }
        },
        include: { members: true }
      });

      const currentAdminId = req.user.id;

      if (!group) {
        group = await prisma.group.create({
          data: {
            name: groupName,
            bio: `Official support channel for report regarding ${report.type}`,
            isDirectMessage: true,
            members: { connect: [{ id: report.reporterId }, { id: currentAdminId }] },
            admins: { connect: { id: currentAdminId } }
          },
          include: { members: true }
        });

        // Add a system message with report summary
        await prisma.message.create({
          data: {
            groupId: group.id,
            authorId: currentAdminId,
            content: `[REPORT_SUMMARY:${report.id}]`
          }
        });
      } else {
        // If group exists, ensure current admin is a member
        const isMember = group.members.some(m => m.id === currentAdminId);
        if (!isMember) {
          group = await prisma.group.update({
            where: { id: group.id },
            data: {
              members: { connect: { id: currentAdminId } }
            },
            include: { members: true }
          });
        }
      }

      res.json({ group });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initiate support chat' });
    }
  });

  app.post('/api/admin/users/:id/action', requireAdmin, async (req: any, res) => {
    try {
      const { type, reason, durationDays } = req.body;
      const userId = req.params.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      let content = '';
      if (type === 'WARNING') {
        content = `Official Warning: ${reason}`;
      } else if (type === 'SUSPEND') {
        const expires = new Date();
        expires.setDate(expires.getDate() + (durationDays || 7));
        await prisma.user.update({
          where: { id: userId },
          data: { isSuspended: true, suspensionExpires: expires }
        });
        content = `Your account has been suspended until ${expires.toLocaleDateString()} for: ${reason}`;
      } else if (type === 'BAN') {
        await prisma.user.update({
          where: { id: userId },
          data: { isBanned: true }
        });
        content = `Your account has been permanently banned for: ${reason}`;
      } else if (type === 'UNBAN') {
        await prisma.user.update({
          where: { id: userId },
          data: { isBanned: false }
        });
        content = `Your account ban has been lifted.`;
      } else if (type === 'UNSUSPEND') {
        await prisma.user.update({
          where: { id: userId },
          data: { isSuspended: false, suspensionExpires: null }
        });
        content = `Your account suspension has been lifted.`;
      }

      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          content,
          link: '/settings'
        }
      });

      await prisma.log.create({
        data: {
          userId: req.user.userId,
          action: `MODERATION_${type}`,
          details: `Target: ${userId}, Reason: ${reason}`
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to perform moderation action' });
    }
  });

  // Reporter view of their report
  app.get('/api/reports/:id', authenticateToken, async (req: any, res) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id },
        include: {
          adminNoteAuthor: { select: { id: true, name: true, username: true, avatarUrl: true } }
        }
      });
      if (!report || (report.reporterId !== req.user.userId && req.user.role !== 'ADMIN')) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Quick on-the-fly enrichment for the details page
      let contentDetails: any = null;
      if (report.type === 'MESSAGE' && report.contentId) {
        const msg = await prisma.message.findUnique({
          where: { id: report.contentId },
          include: { author: { select: { name: true, username: true, avatarUrl: true } } }
        });
        if (msg) contentDetails = msg;
      } else if (report.type === 'FILE' && report.contentId) {
        const file = await prisma.academicFile.findUnique({ where: { id: report.contentId } });
        if (file) contentDetails = file;
      } else if (report.type === 'CLUB' && report.contentId) {
        const club = await prisma.club.findUnique({ where: { id: report.contentId } });
        if (club) contentDetails = club;
      }

      res.json({ report: { ...report, contentDetails } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch report' });
    }
  });

  // User initiates support chat for their own report
  app.post('/api/reports/:id/chat', authenticateToken, async (req: any, res) => {
    try {
      const report = await prisma.report.findUnique({
        where: { id: req.params.id }
      });
      if (!report) return res.status(404).json({ error: 'Report not found' });
      if (report.reporterId !== req.user.userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Find an admin to join the chat (fallback if no specific admin assigned)
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (!admin) return res.status(404).json({ error: 'No support agents available' });

      const groupName = `Support: Report #${report.id.slice(0, 8)}`;
      const targetAdminId = report.adminNoteAuthorId || admin.id;

      let group = await prisma.group.findFirst({
        where: {
          name: groupName,
          members: { some: { id: req.user.userId } }
        }
      });

      if (!group) {
        group = await prisma.group.create({
          data: {
            name: groupName,
            bio: `Official support channel for report regarding ${report.type}`,
            isDirectMessage: true,
            members: { connect: [{ id: req.user.userId }, { id: targetAdminId }] },
            admins: { connect: { id: targetAdminId } }
          }
        });

        await prisma.message.create({
          data: {
            groupId: group.id,
            authorId: targetAdminId,
            content: `Support channel opened. How can we help you regarding your report #${report.id.slice(0, 8)}?`
          }
        });
      }

      res.json({ group });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initiate support chat' });
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

  // Catch-all for undefined API routes to prevent falling through to SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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

  // Seed default admin user and initial data
  try {
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.create({
        data: {
          username: 'admin',
          name: 'System Admin',
          passwordHash: hashedPassword,
          role: 'ADMIN',
        }
      });
      console.log('Default admin user created (username: admin, password: admin123)');

      // Seed initial courses
      const course1 = await prisma.course.create({
        data: {
          name: 'Introduction to Computer Science',
          code: 'CS101',
          description: 'Fundamental concepts of programming and computer science.',
          tags: 'Programming, Freshman',
        }
      });

      const course2 = await prisma.course.create({
        data: {
          name: 'Data Structures and Algorithms',
          code: 'CS201',
          description: 'Advanced data structures and algorithm analysis.',
          tags: 'Algorithms, Sophomore',
        }
      });

      // Seed initial groups
      await prisma.group.create({
        data: {
          name: 'CS101 Study Group',
          bio: 'A group for students taking CS101 to study together.',
          tags: 'Study, CS101',
          courseId: course1.id,
          admins: { connect: { id: admin.id } },
          members: { connect: { id: admin.id } }
        }
      });

      await prisma.group.create({
        data: {
          name: 'Competitive Programming Club',
          bio: 'For students interested in competitive programming and algorithms.',
          tags: 'Algorithms, Competition',
          courseId: course2.id,
          admins: { connect: { id: admin.id } },
          members: { connect: { id: admin.id } }
        }
      });
      console.log('Initial courses and groups seeded.');
    }
  } catch (err) {
    console.error('Failed to seed default admin user:', err);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Seed default admin user and initial data
  (async () => {
    try {
      // Find all users with the admin emails and promote them
      const adminEmails = ['abdulazizalgassem4@gmail.com'];
      
      // Promote specific user to ADMIN if they exist
      await prisma.user.updateMany({
        where: {
          OR: [
            { studentEmail: { in: adminEmails } },
            { googleEmail: { in: adminEmails } }
          ]
        },
        data: { role: 'ADMIN' }
      });

      // Ensure all courses have at least one group
      const coursesWithoutGroups = await prisma.course.findMany({
        where: { groups: { none: {} } }
      });

      if (coursesWithoutGroups.length > 0) {
        console.log(`Found ${coursesWithoutGroups.length} courses without groups. Creating them...`);
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (admin) {
          for (const course of coursesWithoutGroups) {
            await prisma.group.create({
              data: {
                name: `${course.code} - ${course.name}`,
                bio: course.description || `Official group for ${course.name}`,
                tags: course.tags,
                courseId: course.id,
                admins: { connect: { id: admin.id } },
                members: { connect: { id: admin.id } }
              }
            });
          }
          console.log('Auto-created groups for existing courses.');
        }
      }
    } catch (err) {
      console.error('Failed to seed initial data:', err);
    }
  })();
}

startServer();
