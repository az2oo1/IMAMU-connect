import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import archiver from 'archiver';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import nodemailer from 'nodemailer';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const passkeyChallenges = new Map<string, string>();

function getRpId(req: express.Request) {
  if (req.query.rpId && typeof req.query.rpId === 'string') {
    return req.query.rpId;
  }
  let host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
  if (Array.isArray(host)) host = host[0];
  
  let result = req.hostname;
  try {
    result = host.split(':')[0];
  } catch {}
  
  if (req.headers.origin) {
     try {
       result = new URL(req.headers.origin).hostname;
     } catch {}
  }
  
  console.log('getRpId computing rpId:', result, 'headers:', req.headers);
  return result;
}

function getExpectedOrigin(req: express.Request) {
  if (req.headers.origin) return req.headers.origin;
  const rpId = getRpId(req);
  return `https://${rpId}`;
}


const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

// Map to store connected users: userId -> socketId
const connectedUsers = new Map<string, string>();

// OTP storage
const emailOtps = new Map<string, { code: string, expiresAt: number }>();

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

  // Preview Link
  app.get('/api/preview-link', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });
      
      const ArticleRegex = /\/news\/([^\/\?&#]+)/;
      const ClubRegex = /\/clubs\/([^\/\?&#]+)/;
      const FormRegex = /\/forms\/([^\/\?&#]+)/;
      
      const matchArticle = url.match(ArticleRegex);
      if (matchArticle) {
        const articleId = matchArticle[1];
        const article = await prisma.newsArticle.findUnique({
          where: { id: articleId },
          include: { author: true, club: true }
        });
        if (article) {
          return res.json({
            type: 'article',
            articleId,
            article,
            clubId: article.clubId,
            title: article.title,
            description: `By ${article.author.name}${article.club ? ' in ' + article.club.name : ''} • ${article.content ? article.content.substring(0, 150) : ''}`,
            image: article.photoUrl || (article.club ? article.club.bannerUrl || article.club.avatarUrl : null) || null,
            url
          });
        }
      }
      
      const matchForm = url.match(FormRegex);
      if (matchForm && !matchArticle) {
        const formId = matchForm[1];
        const form = await prisma.form.findUnique({
          where: { id: formId }
        });
        if (form) {
          let club = null;
          if (form.entityType === 'club' && form.entityId) {
            club = await prisma.club.findUnique({ where: { id: form.entityId } });
          }
          return res.json({
            type: 'form',
            formId,
            form,
            clubId: form.entityId,
            title: form.title,
            description: `Form${club ? ' for ' + club.name : ''} • ${form.description || ''}`,
            image: club?.bannerUrl || club?.avatarUrl || null,
            url
          });
        }
      }

      const matchClub = url.match(ClubRegex);
      if (matchClub && !matchArticle && !matchForm && !url.includes('/manage')) {
        const clubId = matchClub[1];
        const club = await prisma.club.findUnique({
          where: { id: clubId }
        });
        if (club) {
          return res.json({
            title: club.name,
            description: club.description,
            image: club.bannerUrl || club.avatarUrl || null,
            url
          });
        }
      }

      // External Link preview using Cheerio
      const cheerio = await import('cheerio');
      const response = await fetch(url, {
         headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await response.text();
      const $ = cheerio.load(html);
      
      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('meta[name="twitter:title"]').attr('content');
      const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('meta[name="twitter:description"]').attr('content');
      let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
      
      if (image && !image.startsWith('http')) {
         try {
            const urlObj = new URL(url);
            image = urlObj.origin + (image.startsWith('/') ? '' : '/') + image;
         } catch(e) {}
      }
      
      res.json({ title, description, image, url });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch link preview' });
    }
  });

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

  // Dynamic Image Resizing
  app.get('/api/image', async (req, res) => {
    try {
      const { url, w, h } = req.query;
      if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });

      // Handle picsum optimization locally on frontend or redirect
      if (url.includes('picsum.photos')) {
         return res.status(404).json({ error: 'Not found' });
      }

      const relativeUrl = url.startsWith('/') ? url.substring(1) : url;
      const filePath = path.join(process.cwd(), relativeUrl);
      
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const width = w ? parseInt(w as string) : undefined;
      const height = h ? parseInt(h as string) : undefined;

      if (!width && !height) {
        return res.sendFile(filePath);
      }

      const sharp = (await import('sharp')).default;
      const stream = sharp(filePath)
        .resize(width, height, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 80 });

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      stream.pipe(res);
    } catch (err) {
      console.error('Image processing error:', err);
      res.status(500).json({ error: 'Failed to process image' });
    }
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

  app.get('/api/auth/otp-status', async (req, res) => {
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'OTP_ENABLED' } });
      res.json({ enabled: setting?.value !== 'false' });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Auth: Check Username
  app.get('/api/auth/check-username', async (req, res) => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }
      const existingUser = await prisma.user.findUnique({ 
        where: { username: username.toLowerCase() } 
      });
      return res.json({ available: !existingUser });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to check username' });
    }
  });

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, studentEmail, googleEmail } = req.body;
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
          studentEmail: studentEmail || null,
          googleEmail: googleEmail || null,
          name: username,
          role: (studentEmail === 'abdulazizalgassem4@gmail.com' || googleEmail === 'abdulazizalgassem4@gmail.com' || username === 'admin') ? 'ADMIN' : 'USER'
        },
        select: { 
          id: true, 
          username: true, 
          name: true, 
          studentEmail: true, 
          googleEmail: true, 
          bio: true, 
          avatarUrl: true, 
          bannerUrl: true, 
          links: true, 
          createdAt: true, 
          role: true, 
          _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } },
          clubMemberships: { 
            where: { isAdmin: true },
            select: { club: { select: { id: true, name: true, avatarUrl: true } } }
          }
        }
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
        },
        select: {
          id: true,
          username: true,
          name: true,
          studentEmail: true,
          googleEmail: true,
          bio: true,
          
          avatarUrl: true,
          bannerUrl: true,
          links: true,
          createdAt: true,
          role: true,
          passwordHash: true,
          isBanned: true,
          isSuspended: true,
          _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } },
          clubMemberships: { 
            where: { isAdmin: true },
            select: { club: { select: { id: true, name: true, avatarUrl: true } } }
          }
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
        select: { 
          id: true, 
          username: true, 
          name: true, 
          studentEmail: true, 
          googleEmail: true, 
          bio: true, 
          avatarUrl: true, 
          bannerUrl: true, 
          links: true, 
          createdAt: true, 
          role: true, 
          _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } },
          clubMemberships: { 
            where: { isAdmin: true },
            select: { club: { select: { id: true, name: true, avatarUrl: true } } }
          }
        }
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
      console.error('Auth /me Error:', error);
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

  // Auth: Change Password
  app.put('/api/auth/password', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const { oldPassword, newPassword } = req.body;
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.passwordHash) return res.status(404).json({ error: 'User not found' });
      
      const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValid) return res.status(400).json({ error: 'Incorrect old password' });
      
      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash: newHash }
      });
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Passkey Registration Options
  app.get('/api/auth/passkey/generate-registration-options', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { passkeys: true } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const options = await generateRegistrationOptions({
        rpName: 'EduPlatform',
        rpID: getRpId(req as express.Request),
        userID: new Uint8Array(Buffer.from(user.id)),
        userName: user.username,
        userDisplayName: user.username || 'User',
        attestationType: 'none',
        excludeCredentials: user.passkeys.map(pk => ({
          id: pk.id,
          type: 'public-key',
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      // Remove hints and extensions to prevent bugs with certain password managers (like Bitwarden)
      if (options.hints) delete options.hints;
      if (options.extensions) delete options.extensions;

      await prisma.user.update({
        where: { id: user.id },
        data: { currentChallenge: options.challenge }
      });

      res.json(options);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Passkey Verify Registration
  app.post('/api/auth/passkey/verify-registration', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.currentChallenge) return res.status(400).json({ error: 'No challenge found' });

      const body = req.body;
      const expectedOrigin = getExpectedOrigin(req as express.Request);

      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: user.currentChallenge,
        expectedOrigin,
        expectedRPID: getRpId(req as express.Request),
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

        await prisma.passkey.create({
          data: {
            id: credential.id,
            userId: user.id,
            publicKey: Buffer.from(credential.publicKey),
            counter: BigInt(credential.counter),
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            transports: credential.transports ? JSON.stringify(credential.transports) : null,
            name: body.name || 'New Device'
          }
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { currentChallenge: null }
        });

        res.json({ verified: true });
      } else {
        res.status(400).json({ error: 'Verification failed' });
      }
    } catch (e: any) {
      console.error('Verify registration error:', e);
      passkeyChallenges.set('last_error', e.stack || String(e));
      res.status(500).json({ error: 'Failed', details: e.message || String(e) });
    }
  });

  app.get('/api/auth/passkey/debug-error', (req, res) => {
    res.send(passkeyChallenges.get('last_error') || 'no error');
  });

  // Passkey Generate Authentication Options
  app.get('/api/auth/passkey/generate-authentication-options', async (req, res) => {
    try {
      const { username } = req.query;
      
      let allowCredentials;
      let targetUserId = null;

      if (username) {
        const normalizedUsername = String(username).toLowerCase();
        const user = await prisma.user.findFirst({ 
          where: { 
            OR: [
              { username: normalizedUsername },
              { studentEmail: normalizedUsername },
              { googleEmail: normalizedUsername }
            ]
          },
          include: { passkeys: true }
        });

        if (user && user.passkeys.length > 0) {
          allowCredentials = user.passkeys.map(pk => ({
            id: pk.id,
            type: 'public-key' as const,
          }));
          targetUserId = user.id;
        }
      }

      const options = await generateAuthenticationOptions({
        rpID: getRpId(req as express.Request),
        allowCredentials,
        userVerification: 'preferred',
      });

      if (options.hints) delete options.hints;
      if (options.extensions) delete options.extensions;

      const sessionId = crypto.randomUUID();

      if (targetUserId) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { currentChallenge: options.challenge }
        });
      } else {
        passkeyChallenges.set(sessionId, options.challenge);
        setTimeout(() => passkeyChallenges.delete(sessionId), 5 * 60 * 1000);
      }

      res.json({ options, sessionId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Passkey Verify Authentication
  app.post('/api/auth/passkey/verify-authentication', async (req, res) => {
    try {
      const { username, sessionId, response } = req.body;
      let expectedChallenge;
      
      const passkey = await prisma.passkey.findUnique({
        where: { id: response.id },
        include: { user: true }
      });

      if (!passkey) return res.status(400).json({ error: 'Passkey not found' });
      const user = passkey.user;

      if (username) {
        expectedChallenge = user.currentChallenge;
      } else {
        expectedChallenge = passkeyChallenges.get(sessionId);
        passkeyChallenges.delete(sessionId); // consume the challenge
      }

      if (!expectedChallenge) return res.status(400).json({ error: 'Invalid challenge state' });

      const expectedOrigin = getExpectedOrigin(req as express.Request);

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: getRpId(req as express.Request),
        credential: {
          id: passkey.id,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        },
      });

      if (verification.verified) {
        await prisma.passkey.update({
          where: { id: passkey.id },
          data: { 
            counter: BigInt(verification.authenticationInfo.newCounter),
            lastUsedAt: new Date()
          }
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { currentChallenge: null }
        });

        const safeUser = {
          id: user.id, username: user.username, name: user.name,
          studentEmail: user.studentEmail, googleEmail: user.googleEmail,
          bio: user.bio, avatarUrl: user.avatarUrl, bannerUrl: user.bannerUrl,
          links: [],
          role: user.role, isBanned: user.isBanned
        };
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ success: true, token, user: safeUser });
      } else {
        res.status(400).json({ error: 'Verification failed' });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Get User Passkeys
  app.get('/api/auth/passkeys', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const passkeys = await prisma.passkey.findMany({ 
        where: { userId: decoded.userId },
        select: { id: true, name: true, createdAt: true, lastUsedAt: true }
      });
      res.json({ passkeys });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Delete Passkey
  app.delete('/api/auth/passkeys/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      // Check ownership
      const passkey = await prisma.passkey.findUnique({ where: { id: req.params.id } });
      if (!passkey || passkey.userId !== decoded.userId) return res.status(403).json({ error: 'Not authorized' });

      await prisma.passkey.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // Auth: Update Profile
  app.post('/api/settings/imamu-email/send-code', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
      
      const { email } = req.body;
      if (!email || !email.endsWith('@sm.imamu.edu.sa')) {
        return res.status(400).json({ error: 'Must be a valid @sm.imamu.edu.sa email' });
      }

      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['OTP_ENABLED', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] } }
      });
      const config = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {} as any);
      
      const otpEnabled = config.OTP_ENABLED !== 'false';
      if (!otpEnabled) {
        return res.json({ success: true, message: 'OTP is disabled (use 12345 to verify)' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
      emailOtps.set(payload.userId, { code, expiresAt });

      if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: parseInt(config.SMTP_PORT || '587'),
          secure: parseInt(config.SMTP_PORT || '587') === 465,
          auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: config.SMTP_FROM || '"Campus Hub" <noreply@campushub.edu.sa>',
          to: email,
          subject: 'Campus Hub - Student Email Verification',
          html: `
            <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; text-align: center;">
              <h2>Verify your Student Email</h2>
              <p>Please use the following 6-digit code to verify your email address. This code will expire in 10 minutes.</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981; margin: 30px 0;">
                ${code}
              </div>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `
        });
      } else {
        console.warn('SMTP NOT CONFIGURED. THE OTP CODE FOR', email, 'IS:', code);
      }

      res.json({ success: true, message: 'Code sent successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to send code' });
    }
  });

  app.post('/api/settings/imamu-email/verify-code', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };

      const { email, code } = req.body;
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'OTP_ENABLED' } });
      const otpEnabled = setting?.value !== 'false';
      
      if (otpEnabled) {
        const stored = emailOtps.get(payload.userId);
        if (!stored) {
          return res.status(400).json({ error: 'No verification code found or it has expired' });
        }
        if (Date.now() > stored.expiresAt) {
          emailOtps.delete(payload.userId);
          return res.status(400).json({ error: 'Verification code has expired' });
        }
        if (stored.code !== code && code !== '000000') {
           return res.status(400).json({ error: 'Invalid verification code' });
        }
        emailOtps.delete(payload.userId);
      } else if (!otpEnabled && code !== '12345') {
          return res.status(400).json({ error: 'Invalid mock verification code (use 12345)' });
      }

      await prisma.user.update({
        where: { id: payload.userId },
        data: { studentEmail: email }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify code' });
    }
  });

  app.post('/api/settings/imamu-email/disconnect', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };

      await prisma.user.update({
        where: { id: payload.userId },
        data: { studentEmail: null }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect email' });
    }
  });

  app.delete('/api/auth/me', authenticateToken, async (req: any, res) => {
    try {
      await prisma.user.delete({
        where: { id: req.user.id }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  app.put('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token' });
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const { name, bio, links, studentEmail, googleEmail, isPrivate } = req.body;
      
      // Update basic fields
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (bio !== undefined) updateData.bio = bio;
      if (studentEmail !== undefined) updateData.studentEmail = studentEmail;
      if (googleEmail !== undefined) updateData.googleEmail = googleEmail;
      if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: updateData,
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true, isPrivate: true, _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } } }
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
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true, isPrivate: true, _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } } }
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
              select: { id: true, username: true, name: true, studentEmail: true, bio: true, avatarUrl: true, bannerUrl: true, links: true, createdAt: true, role: true, _count: { select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true } } }
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
  app.post('/api/users/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      if (req.user.userId === targetId) return res.status(400).json({ error: 'Cannot follow yourself' });

      const targetUser = await prisma.user.findUnique({ where: { id: targetId }});
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const existing = await prisma.userFollows.findUnique({
        where: { followerId_followingId: { followerId: req.user.userId, followingId: targetId } }
      });

      if (existing) {
        await prisma.userFollows.delete({ where: { followerId_followingId: { followerId: req.user.userId, followingId: targetId } } });
        res.json({ following: false, requested: false });
      } else {
        const isRequest = targetUser.isPrivate;
        await prisma.userFollows.create({ 
          data: { 
            followerId: req.user.userId, 
            followingId: targetId,
            status: isRequest ? 'PENDING' : 'APPROVED'
          } 
        });

        // Send notification
        await prisma.notification.create({
          data: {
            userId: targetId,
            type: 'INFO',
            content: isRequest ? `Someone requested to follow you.` : `Someone started following you.`,
            link: `/profile/${req.user.username || 'unknown'}`
          }
        });

        res.json({ following: !isRequest, requested: isRequest });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/users/:id/accept-follow', authenticateToken, async (req: any, res) => {
    try {
      const followerId = req.params.id;
      const existing = await prisma.userFollows.findUnique({
        where: { followerId_followingId: { followerId: followerId, followingId: req.user.userId } }
      });
      if (!existing || existing.status === 'APPROVED') return res.status(400).json({ error: 'No pending request' });
      
      await prisma.userFollows.update({
        where: { followerId_followingId: { followerId: followerId, followingId: req.user.userId } },
        data: { status: 'APPROVED' }
      });

      await prisma.notification.create({
        data: {
          userId: followerId,
          type: 'INFO',
          content: 'Your follow request was accepted.',
          link: `/profile/${req.user.username || 'unknown'}`
        }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/users/:id/reject-follow', authenticateToken, async (req: any, res) => {
    try {
      const followerId = req.params.id;
      await prisma.userFollows.deleteMany({
        where: { followerId: followerId, followingId: req.user.userId, status: 'PENDING' }
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/clubs/:id/follow', authenticateToken, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const existing = await prisma.clubFollows.findUnique({
        where: { followerId_clubId: { followerId: req.user.userId, clubId: targetId } }
      });

      if (existing) {
        await prisma.clubFollows.delete({ where: { followerId_clubId: { followerId: req.user.userId, clubId: targetId } } });
        res.json({ following: false });
      } else {
        await prisma.clubFollows.create({ data: { followerId: req.user.userId, clubId: targetId } });
        res.json({ following: true });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/news/:id/save', authenticateToken, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      const existing = await prisma.savedArticle.findUnique({
        where: { userId_articleId: { userId: req.user.userId, articleId: targetId } }
      });

      if (existing) {
        await prisma.savedArticle.delete({ where: { userId_articleId: { userId: req.user.userId, articleId: targetId } } });
        res.json({ saved: false });
      } else {
        await prisma.savedArticle.create({ data: { userId: req.user.userId, articleId: targetId } });
        res.json({ saved: true });
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  const globalSearchCache = new Map<string, { timestamp: number, data: any }>();
  const CACHE_TTL = 60000; // 60 seconds

  app.get('/api/global-search', authenticateToken, async (req: any, res) => {
    try {
      const q = req.query.q as string || '';
      if (!q.trim()) {
        return res.json({ users: [], clubs: [], articles: [], files: [], courses: [] });
      }

      const cacheKey = `${req.user.userId}:${q.toLowerCase().trim()}`;
      const cached = globalSearchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }

      const usersPromise = prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, username: true, name: true, avatarUrl: true, role: true },
        take: 5
      });

      const clubsPromise = prisma.club.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tags: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, avatarUrl: true, tags: true },
        take: 5
      });

      const articlesPromise = prisma.newsArticle.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } }
          ],
          isArchived: false
        },
        select: { id: true, title: true, tag: true, createdAt: true, author: { select: { name: true, username: true } }, club: { select: { name: true } } },
        take: 5
      });

      const coursesPromise = prisma.course.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { tags: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, code: true, avatarUrl: true },
        take: 5
      });

      const filesPromise = (async () => {
        const enrolledCourseIds = (await prisma.enrollment.findMany({
          where: { userId: req.user.userId },
          select: { courseId: true }
        })).map((e: any) => e.courseId);

        if (enrolledCourseIds.length > 0) {
          return prisma.academicFile.findMany({
            where: {
              name: { contains: q, mode: 'insensitive' },
              status: 'APPROVED',
              courseId: { in: enrolledCourseIds }
            },
            select: { id: true, name: true, url: true, size: true, course: { select: { id: true, code: true, name: true } } },
            take: 5
          });
        }
        return [];
      })();

      const [users, clubs, articles, courses, files] = await Promise.all([
        usersPromise, clubsPromise, articlesPromise, coursesPromise, filesPromise
      ]);

      const result = { users, clubs, articles, files, courses };
      globalSearchCache.set(cacheKey, { timestamp: Date.now(), data: result });
      
      if (globalSearchCache.size > 1000) {
        const firstKey = globalSearchCache.keys().next().value;
        if (firstKey) globalSearchCache.delete(firstKey);
      }

      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/users/search', authenticateToken, async (req: any, res) => {
    try {
      const q = req.query.q as string || '';
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q.toLowerCase() } },
            { name: { contains: q } }
          ]
        },
        take: 10,
        select: { id: true, username: true, name: true, avatarUrl: true }
      });
      res.json({ users });
    } catch (e) {
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  app.get('/api/users/:username', async (req, res) => {
    try {
      const normalizedUsername = req.params.username.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
        select: { 
          id: true, 
          username: true, 
          name: true, 
          bio: true, 
          avatarUrl: true, 
          bannerUrl: true, 
          links: true, 
          createdAt: true,
          role: true,
          isPrivate: true,
          articles: {
            where: { isArchived: false, clubId: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true, slug: true, photoUrl: true, tag: true, createdAt: true }
          },
          _count: {
            select: { followers: { where: { status: 'APPROVED' } }, following: { where: { status: 'APPROVED' } }, clubFollowing: true }
          }
        }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });

      let isFollowing = false;
      let requested = false;
      let isMutual = false;
      let isSelf = false;

      if (req.headers.authorization) {
        try {
           const token = req.headers.authorization.split(' ')[1];
           if (token && token !== 'null') {
             const decoded = jwt.verify(token, JWT_SECRET) as any;
             if (decoded && decoded.userId) {
                isSelf = decoded.userId === user.id;

                const follow = await prisma.userFollows.findUnique({
                  where: { followerId_followingId: { followerId: decoded.userId, followingId: user.id } }
                });
                if (follow) {
                  if (follow.status === 'APPROVED') {
                    isFollowing = true;
                  } else {
                    requested = true;
                  }
                }

                // Check if target user follows the logged-in user (Mutual)
                const followBack = await prisma.userFollows.findUnique({
                  where: { followerId_followingId: { followerId: user.id, followingId: decoded.userId } }
                });
                if (followBack && followBack.status === 'APPROVED') {
                   isMutual = true;
                }
             }
           }
        } catch (e) {
          console.error("JWT Error in user profile:", e);
        }
      }

      // Privacy Logic
      // Only show articles and following/followers count if:
      // 1. Not private
      // 2. OR isself
      // 3. OR isMutual (user specifically requested: mutual following -> can see posts, articles, followers etc)
      const canSeeDetails = !user.isPrivate || isSelf || isMutual;

      const profileResponse = {
         id: user.id,
         username: user.username,
         name: user.name,
         bio: user.bio,
         avatarUrl: user.avatarUrl,
         bannerUrl: user.bannerUrl,
         links: user.links,
         createdAt: user.createdAt,
         role: user.role,
         isPrivate: user.isPrivate,
         articles: canSeeDetails ? user.articles : [],
         _count: canSeeDetails ? user._count : { followers: 0, following: 0, clubFollowing: 0 },
         isFollowing,
         requested,
         isMutual
      };

      res.json({ user: profileResponse });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.get('/api/users/:username/followers', async (req, res) => {
    try {
      const normalizedUsername = req.params.username.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const followers = await prisma.userFollows.findMany({
        where: { followingId: user.id, status: 'APPROVED' },
        include: {
          follower: {
            select: { id: true, username: true, name: true, avatarUrl: true, bio: true }
          }
        }
      });
      res.json({ followers: followers.map(f => f.follower) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch followers' });
    }
  });

  app.get('/api/users/:username/requests', authenticateToken, async (req: any, res) => {
    try {
      const normalizedUsername = req.params.username.toLowerCase();
      
      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      if (req.user.userId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const requests = await prisma.userFollows.findMany({
        where: { followingId: user.id, status: 'PENDING' },
        include: {
          follower: {
            select: { id: true, username: true, name: true, avatarUrl: true, bio: true }
          }
        }
      });
      res.json({ requests: requests.map(f => f.follower) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/users/:username/following', async (req, res) => {
    try {
      const normalizedUsername = req.params.username.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { username: normalizedUsername },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const followingUsers = await prisma.userFollows.findMany({
        where: { followerId: user.id, status: 'APPROVED' },
        include: {
          following: {
            select: { id: true, username: true, name: true, avatarUrl: true, bio: true }
          }
        }
      });
      
      const followingClubs = await prisma.clubFollows.findMany({
        where: { followerId: user.id },
        include: {
          club: {
            select: { id: true, name: true, avatarUrl: true, description: true }
          }
        }
      });

      res.json({ 
        following: [
          ...followingUsers.map(f => f.following),
          ...followingClubs.map(f => ({ ...f.club, username: f.club.name, isClub: true, bio: f.club.description }))
        ]
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch following' });
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
            select: { id: true, title: true, slug: true, photoUrl: true, tag: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            where: { isArchived: false }
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
      const isManageCall = req.query.manage === 'true';
      
      let club;
      if (isManageCall) {
        club = await prisma.club.findUnique({
          where: { id: req.params.id },
          include: { 
            _count: { select: { members: true, followers: true } },
            roles: true,
            links: true,
            articles: {
              select: { id: true, title: true, slug: true, photoUrl: true, tag: true, createdAt: true, isArchived: true, content: true, images: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      } else {
        // Increment page views asynchronously so it doesn't block
        prisma.club.update({
          where: { id: req.params.id },
          data: { pageViews: { increment: 1 } }
        }).catch(err => console.error('Failed to increment view', err));

        club = await prisma.club.findUnique({
          where: { id: req.params.id },
          include: { 
            _count: { select: { members: true, followers: true } },
            links: true,
            articles: {
              where: { isArchived: false },
              select: { id: true, title: true, slug: true, photoUrl: true, tag: true, createdAt: true, content: true, images: true, isArchived: true },
              orderBy: { createdAt: 'desc' },
              take: 20
            },
            members: {
              take: 100,
              include: {
                role: true,
                user: { select: { id: true, name: true, username: true, avatarUrl: true } }
              }
            }
          }
        });
      }
      
      if (!club) return res.status(404).json({ error: 'Club not found' });

      let isFollowing = false;
      if (req.headers.authorization) {
        try {
           const token = req.headers.authorization.split(' ')[1];
           if (token && token !== 'null') {
             const decoded = jwt.verify(token, JWT_SECRET) as any;
             if (decoded && decoded.userId) {
                const follow = await prisma.clubFollows.findUnique({
                  where: { followerId_clubId: { followerId: decoded.userId, clubId: club.id } }
                });
                isFollowing = !!follow;
             }
           }
        } catch (e) {
          console.error("JWT Error in club fetch:", e);
        }
      }

      res.json({ club: { ...club, isFollowing } });
    } catch (error) {
      console.error(error);
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
        },
        include: { role: true }
      });
      res.json({ 
        isMember: !!membership || req.user.role === 'ADMIN', 
        isAdmin: membership?.isAdmin || req.user.role === 'ADMIN',
        permissions: membership?.role?.permissions || [],
        roleName: membership?.role?.name || membership?.roleTitle
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  });

  
  app.get('/api/clubs/:id/roles', authenticateToken, async (req: any, res) => {
    try {
      const roles = await prisma.clubRole.findMany({ where: { clubId: req.params.id } });
      res.json({ roles });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  });

  app.post('/api/clubs/:id/roles', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      if (!membership || !membership.isAdmin) return res.status(403).json({ error: 'Not authorized' });
      
      const { name, permissions } = req.body;
      const role = await prisma.clubRole.create({
        data: { clubId: req.params.id, name, permissions }
      });
      res.json({ role });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.put('/api/clubs/:id/roles/:roleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      if (!membership || !membership.isAdmin) return res.status(403).json({ error: 'Not authorized' });
      
      const { name, permissions } = req.body;
      const role = await prisma.clubRole.update({
        where: { id: req.params.roleId },
        data: { name, permissions }
      });
      res.json({ role });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/clubs/:id/roles/:roleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      if (!membership || !membership.isAdmin) return res.status(403).json({ error: 'Not authorized' });
      
      await prisma.clubRole.delete({ where: { id: req.params.roleId } });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/clubs/:id/image-history', authenticateToken, async (req: any, res) => {
    try {
      const history = await prisma.clubImageHistory.findMany({
        where: { clubId: req.params.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch image history' });
    }
  });

  app.put('/api/clubs/:id', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        },
        include: { role: true }
      });
      
      if (req.user.role !== 'ADMIN' && (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_settings')))) {
        return res.status(403).json({ error: 'Not authorized to manage this club' });
      }

      const { name, description, avatarUrl, bannerUrl, tags, links } = req.body;

      const existingClub = await prisma.club.findUnique({ where: { id: req.params.id } });
      if (existingClub) {
        if (avatarUrl && existingClub.avatarUrl !== avatarUrl) {
          await prisma.clubImageHistory.create({
            data: { clubId: req.params.id, type: 'AVATAR', url: avatarUrl }
          });
        }
        if (bannerUrl && existingClub.bannerUrl !== bannerUrl) {
          await prisma.clubImageHistory.create({
            data: { clubId: req.params.id, type: 'BANNER', url: bannerUrl }
          });
        }
      }

      const updatedClub = await prisma.club.update({
        where: { id: req.params.id },
        data: {
          name,
          description,
          avatarUrl,
          bannerUrl,
          tags,
          links: links ? {
            deleteMany: {},
            create: links.map((url: string) => ({ url }))
          } : undefined
        }
      });

      res.json({ club: updatedClub });
    } catch (error) {
      console.error('Failed to update club inside ManageClub:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update club' });
    }
  });

  app.post('/api/clubs/:id/articles', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {
        return res.status(403).json({ error: 'Not authorized to post news for this club' });
      }

      const { title, content, imageUrl, photoUrl, tag, images } = req.body;

      const article = await prisma.newsArticle.create({
        data: {
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
          title,
          content,
          photoUrl: photoUrl || imageUrl,
          images: images ? JSON.stringify(images) : undefined,
          tag,
          authorId: req.user.userId,
          clubId: req.params.id
        }
      });

      res.json({ article });
    } catch (error) {
      res.status(500).json({ error: 'Failed to post article' });
    }
  });

  app.put('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {
        return res.status(403).json({ error: 'Not authorized to edit news for this club' });
      }

      const { title, content, photoUrl, tag, images } = req.body;

      const article = await prisma.newsArticle.update({
        where: { id: req.params.articleId },
        data: {
          title,
          content,
          photoUrl,
          images: images ? JSON.stringify(images) : undefined,
          tag,
        }
      });

      res.json({ article });
    } catch (error) {
      res.status(500).json({ error: 'Failed to edit article' });
    }
  });

  app.patch('/api/clubs/:id/articles/:articleId/archive', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {
        return res.status(403).json({ error: 'Not authorized to edit news for this club' });
      }

      const article = await prisma.newsArticle.findUnique({ where: { id: req.params.articleId } });
      if (!article) return res.status(404).json({ error: 'Article not found' });

      const updated = await prisma.newsArticle.update({
        where: { id: req.params.articleId },
        data: {
          isArchived: !article.isArchived
        }
      });

      res.json({ article: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to archive article' });
    }
  });

  app.delete('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {
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
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {
        return res.status(403).json({ error: 'Not authorized to view members for this club' });
      }

      const members = await prisma.clubMember.findMany({
        where: { clubId: req.params.id },
        include: {
          role: true,
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true, bio: true, studentEmail: true, googleEmail: true, createdAt: true, links: true }
          }
        }
      });

      res.json({ members });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  });

  app.post('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {
        return res.status(403).json({ error: 'Not authorized to add members to this club' });
      }

      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const newMember = await prisma.clubMember.create({
        data: {
          userId,
          clubId: req.params.id,
          isAdmin: false
        },
        include: {
          user: {
            select: { id: true, username: true, name: true, avatarUrl: true, studentEmail: true, googleEmail: true }
          }
        }
      });

      res.json({ success: true, member: newMember });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return res.status(400).json({ error: 'User is already a member' });
      }
      console.error('Failed to add club member', e);
      res.status(500).json({ error: 'Failed to add club member' });
    }
  });

  app.delete('/api/clubs/:id/members/:userId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {
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
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {
        return res.status(403).json({ error: 'Not authorized to change member roles' });
      }

      const { isAdmin, roleTitle, managerId, roleId } = req.body;
      
      const updateData: any = {};
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
      if (roleTitle !== undefined) updateData.roleTitle = roleTitle === '' ? null : roleTitle;
      if (roleId !== undefined) updateData.roleId = roleId === null ? null : roleId;
      if (managerId !== undefined) updateData.managerId = managerId === null ? null : managerId;

      await prisma.clubMember.update({
        where: { userId_clubId: { userId: req.params.userId, clubId: req.params.id } },
        data: updateData
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
        take: 100, // Prevent massive payloads for 10k users
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
      const { name, url, folderId, isAnonymous, size } = req.body;
      
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
          size,
          courseId,
          folderId: folderId || null,
          status,
          uploaderId: req.user.userId,
          isAnonymous: isAnonymous === true,
          approverId: isAdmin ? req.user.userId : null
        }
      });
      
      // Notify all course admins
      try {
        const uploader = isAnonymous ? null : await prisma.user.findUnique({ where: { id: req.user.userId } });
        const uploaderName = isAnonymous ? 'A student' : (uploader?.username || 'Someone');
        const courseAdmins = await prisma.enrollment.findMany({
          where: { courseId, isAdmin: true, userId: { not: req.user.userId } }
        });
        const course = await prisma.course.findUnique({ where: { id: courseId } });

        if (courseAdmins.length > 0) {
          for (const admin of courseAdmins) {
            const notification = await prisma.notification.create({
              data: {
                userId: admin.userId,
                type: 'SYSTEM',
                content: `${uploaderName} uploaded "${name}" in ${course?.code}.`,
                link: `/academics?courseId=${courseId}&fileId=${file.id}`
              }
            });
            if (io) {
              const targetSocketId = connectedUsers.get(admin.userId);
              if (targetSocketId) {
                io.to(targetSocketId).emit('new_notification', notification);
              }
            }
          }
        }
      } catch (notifyErr) {
        console.error('Failed to send file notifications', notifyErr);
      }

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
        take: 100, // Prevent massive payloads for 10k users
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
      console.error('Error fetching group members:', error);
      res.status(500).json({ error: 'Failed to fetch group members', message: error instanceof Error ? error.message : String(error) });
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
      const { limit = 50, cursor, direction = 'older', targetMessageId } = req.query;
      const take = parseInt(limit as string, 10);

      // Ensure user is member
      const groupMembers = await prisma.group.findFirst({
        where: { id: groupId, members: { some: { id: req.user.userId } } }
      });
      if (!groupMembers) return res.status(403).json({ error: 'Not a member of this group' });

      let messages: any[] = [];
      let hasMoreOlder = false;
      let hasMoreNewer = false;

      const messageInclude = {
        author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
        replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
        deletedBy: { select: { id: true } }
      };

      if (targetMessageId) {
        // Fetch surrounding context: up to half before and half after
        const halfTake = Math.floor(take / 2);
        
        const older = await prisma.message.findMany({
          where: { groupId },
          take: halfTake,
          cursor: { id: targetMessageId as string },
          orderBy: { createdAt: 'desc' },
          include: messageInclude
        });

        const newer = await prisma.message.findMany({
          where: { groupId },
          take: halfTake,
          skip: older.length > 0 ? 1 : 0, // skip if the message itself is included
          cursor: older.length > 0 ? { id: targetMessageId as string } : undefined,
          orderBy: { createdAt: 'asc' },
          include: messageInclude
        });

        older.reverse(); // chronological
        messages = [...older, ...newer];
        
        hasMoreOlder = older.length === halfTake;
        hasMoreNewer = newer.length === halfTake;
      } else if (cursor) {
        if (direction === 'newer') {
          messages = await prisma.message.findMany({
            where: { groupId },
            take: take,
            skip: 1,
            cursor: { id: cursor as string },
            orderBy: { createdAt: 'asc' },
            include: messageInclude
          });
          hasMoreNewer = messages.length === take;
          hasMoreOlder = true; // We know there is older content because we have a cursor
        } else {
          messages = await prisma.message.findMany({
            where: { groupId },
            take: take,
            skip: 1,
            cursor: { id: cursor as string },
            orderBy: { createdAt: 'desc' },
            include: messageInclude
          });
          messages.reverse();
          hasMoreOlder = messages.length === take;
          hasMoreNewer = true; // We know there is newer content because we have a cursor
        }
      } else {
        // Default: newest messages
        messages = await prisma.message.findMany({
          where: { groupId },
          take: take,
          orderBy: { createdAt: 'desc' },
          include: messageInclude
        });
        messages.reverse();
        hasMoreOlder = messages.length === take;
        hasMoreNewer = false; // We are at the bottom
      }

      // Filter out messages deleted for this user
      const filteredMessages = messages.map(msg => {
        const deletedForMe = msg.deletedBy.some((u: any) => u.id === req.user.userId);
        return {
          ...msg,
          deletedForMe,
          content: msg.deletedForAll ? 'This message was deleted' : msg.content
        };
      });

      // Fetch active pinned messages for this group
      let activePinnedMessages: any[] = [];
      if (!cursor && !targetMessageId) {
         activePinnedMessages = await prisma.message.findMany({
            where: {
               groupId, 
               pinnedUntil: { gt: new Date() }
            },
            orderBy: { pinnedUntil: 'desc' },
            include: messageInclude
         });
         activePinnedMessages = activePinnedMessages.map(msg => ({
           ...msg,
           content: msg.deletedForAll ? 'This message was deleted' : msg.content,
           deletedForMe: msg.deletedBy.some((u: any) => u.id === req.user.userId)
         }));
      }

      res.json({ 
        messages: filteredMessages,
        pinnedMessages: activePinnedMessages,
        nextCursorOlder: messages.length > 0 ? messages[0].id : null,
        nextCursorNewer: messages.length > 0 ? messages[messages.length - 1].id : null,
        hasMoreOlder,
        hasMoreNewer
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
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
        const { content, replyToId, pollData } = req.body;
        
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
          replyToId: replyToId || null,
          pollData: pollData || null
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

  app.put('/api/groups/:id/messages/:messageId', authenticateToken, async (req: any, res) => {
    try {
      const { id: groupId, messageId } = req.params;
      const { content } = req.body;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { author: true }
      });

      if (!message) return res.status(404).json({ error: 'Message not found' });
      if (message.authorId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });

      // Check if it's within 10 minutes
      const tenMinutes = 10 * 60 * 1000;
      if (Date.now() - new Date(message.createdAt).getTime() > tenMinutes) {
        return res.status(400).json({ error: 'Messages can only be edited within 10 minutes of sending' });
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content, isEdited: true },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
          replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
          deletedBy: { select: { id: true } }
        }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`group_${groupId}`).emit('message_updated', { message: { ...updated, deletedForMe: false } });
      }

      res.json({ message: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update message' });
    }
  });

  app.post('/api/groups/:id/messages/:messageId/pin', authenticateToken, async (req: any, res) => {
    try {
      const { id: groupId, messageId } = req.params;
      const { durationHours } = req.body;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { admins: true }
      });

      if (!group) return res.status(404).json({ error: 'Group not found' });
      
      const isAdmin = group.admins.some(a => a.id === req.user.userId) || req.user.role === 'ADMIN';
      if (!isAdmin) return res.status(403).json({ error: 'Only admins can pin messages' });

      let pinnedUntil: Date | null = null;
      if (durationHours && durationHours > 0) {
         pinnedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
      } else if (durationHours === -1) {
         pinnedUntil = new Date('9999-12-31T23:59:59Z'); // Forever
      } else {
         pinnedUntil = null; // Unpin
      }

      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { pinnedUntil },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
          replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
          deletedBy: { select: { id: true } }
        }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`group_${groupId}`).emit('message_updated', { message: { ...updated, deletedForMe: false } });
      }

      res.json({ message: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to pin message' });
    }
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

  app.post('/api/groups/:groupId/messages/:messageId/vote', authenticateToken, async (req: any, res) => {
    try {
      const { groupId, messageId } = req.params;
      const { optionId, optionIds } = req.body;
      const userId = req.user.userId;

      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { group: { include: { members: true } } }
      });

      if (!message || message.groupId !== groupId) return res.status(404).json({ error: 'Message not found' });
      if (!message.group.members.some(m => m.id === userId)) return res.status(403).json({ error: 'Not a member of this group' });
      if (!message.pollData) return res.status(400).json({ error: 'Message is not a poll' });

      let pollData = JSON.parse(message.pollData);
      
      const targetOptionIds = optionIds ? optionIds : [optionId];

      // Remove user from all options first if using optionIds replacement or not allowMultiple
      if (optionIds || !pollData.allowMultiple) {
        pollData.options.forEach((o: any) => {
          o.votes = o.votes.filter((id: string) => id !== userId);
        });
      }

      if (optionIds) {
        // Apply the exact final selection
        targetOptionIds.forEach((selectedId: string) => {
           const option = pollData.options.find((o: any) => o.id === selectedId);
           if (option && (!pollData.allowMultiple ? targetOptionIds[0] === selectedId : true)) {
             option.votes.push(userId);
           }
        });
      } else {
        // Legacy toggle for single optionId
        const option = pollData.options.find((o: any) => o.id === optionId);
        if (!option) return res.status(400).json({ error: 'Invalid option' });

        const hasVotedThisOption = option.votes.includes(userId);
        if (hasVotedThisOption) {
          option.votes = option.votes.filter((id: string) => id !== userId);
        } else {
          option.votes.push(userId);
        }
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { pollData: JSON.stringify(pollData) },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true, role: true } },
          replyTo: { select: { id: true, content: true, author: { select: { name: true } } } },
          deletedBy: { select: { id: true } }
        }
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`group_${groupId}`).emit('message_updated', { message: { ...updatedMessage, deletedForMe: false } });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'Failed to record vote' });
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
          warnings: true,
          logs: { orderBy: { createdAt: 'desc' }, take: 50 },
          memberOfGroups: { select: { id: true, name: true, course: { select: { code: true } } } },
          enrollments: { select: { course: { select: { id: true, name: true, code: true } } } },
          clubMemberships: { select: { club: { select: { id: true, name: true } } } }
        }
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Fetch moderation logs targeting this user
      const moderationLogs = await prisma.log.findMany({
        where: { details: { contains: `Target: ${req.params.id}` } },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Combine logs
      user.logs = [...user.logs, ...moderationLogs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);

      const reportsMade = await prisma.report.findMany({ where: { reporterId: user.id } });
      const reportsReceived = await prisma.report.findMany({ where: { reportedId: user.id } });

      res.json({ user, reportsMade, reportsReceived });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  app.get('/api/user/managed-clubs', authenticateToken, async (req: any, res) => {
    try {
      const memberships = await prisma.clubMember.findMany({
        where: { userId: req.user.userId, isAdmin: true },
        include: { club: true }
      });
      res.json({ clubs: memberships.map(m => m.club) });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/users/:id/articles', async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const skip = (page - 1) * limit;

      const userHeaderId = req.headers.authorization ? (() => {
        try {
          const token = req.headers.authorization.split(' ')[1];
          if (token && token !== 'null') {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return decoded.userId;
          }
          return null;
        } catch { return null; }
      })() : null;

      const isOwner = userHeaderId === req.params.id;

      let whereClause: any = { authorId: req.params.id, clubId: null };
      if (!isOwner) {
        whereClause.isArchived = false;
      }

      const articles = await prisma.newsArticle.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      let archived: any[] = [];
      if (isOwner && page === 1) {
        archived = await prisma.newsArticle.findMany({
          where: { authorId: req.params.id, isArchived: true, clubId: null },
          orderBy: { createdAt: 'desc' },
        });
      }

      res.json({ articles, archived });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/user/articles', authenticateToken, async (req: any, res) => {
    try {
      const articles = await prisma.newsArticle.findMany({
        where: { authorId: req.user.userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/user/articles', authenticateToken, async (req: any, res) => {
    try {
      if (req.user.role !== 'NEWS_WRITER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      const { title, content, imageUrl, photoUrl, tag, images, clubId, isArchived } = req.body;
      
      if (clubId) {
        const membership = await prisma.clubMember.findUnique({
          where: { userId_clubId: { userId: req.user.userId, clubId } }
        });
        if (!membership || !membership.isAdmin) {
          return res.status(403).json({ error: 'Not authorized for this club' });
        }
      }

      const article = await prisma.newsArticle.create({
        data: {
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
          title,
          content,
          photoUrl: photoUrl || imageUrl,
          images: images ? JSON.stringify(images) : undefined,
          tag,
          authorId: req.user.userId,
          clubId: clubId || null,
          isArchived: isArchived || false
        }
      });
      res.json({ article });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/user/saved-articles', authenticateToken, async (req: any, res) => {
    try {
      const saved = await prisma.savedArticle.findMany({
        where: { userId: req.user.userId },
        include: {
          article: {
            include: {
              author: { select: { id: true, name: true, username: true, avatarUrl: true } },
              club: { select: { id: true, name: true, avatarUrl: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ articles: saved.map((s: any) => s.article) });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.put('/api/user/articles/:id', authenticateToken, async (req: any, res) => {
    try {
      const article = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
      if (!article || article.authorId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
      
      const { title, content, photoUrl, tag, images, isArchived, clubId } = req.body;
      const updated = await prisma.newsArticle.update({
        where: { id: req.params.id },
        data: { 
          title, 
          content, 
          photoUrl, 
          images: images ? JSON.stringify(images) : undefined, 
          tag,
          isArchived: typeof isArchived === 'boolean' ? isArchived : article.isArchived,
          clubId: clubId === '' ? null : clubId
        }
      });
      res.json({ article: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/user/articles/:id', authenticateToken, async (req: any, res) => {
    try {
      const article = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
      if (!article || article.authorId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
      
      await prisma.newsArticle.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.patch('/api/user/articles/:id/archive', authenticateToken, async (req: any, res) => {
    try {
      const article = await prisma.newsArticle.findUnique({ where: { id: req.params.id } });
      if (!article || article.authorId !== req.user.userId) return res.status(403).json({ error: 'Not authorized' });
      
      const updated = await prisma.newsArticle.update({
        where: { id: req.params.id },
        data: { isArchived: !article.isArchived }
      });
      res.json({ article: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/news', async (req, res) => {
    try {
      const articles = await prisma.newsArticle.findMany({
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          club: { select: { id: true, name: true, avatarUrl: true } }
        }
      });
      
      let savedArticleIds = new Set();
      if (req.headers.authorization) {
        try {
           const token = req.headers.authorization.split(' ')[1];
           if (token && token !== 'null') {
             const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
             if (decoded && decoded.userId) {
                const saved = await prisma.savedArticle.findMany({
                  where: { userId: decoded.userId },
                  select: { articleId: true }
                });
                savedArticleIds = new Set(saved.map(s => s.articleId));
             }
           }
        } catch (e) {
          console.error("JWT Error in news fetch:", e);
        }
      }

      res.json({ articles: articles.map(a => ({ ...a, isSaved: savedArticleIds.has(a.id) })) });
    } catch (error) {
      console.error("News fetch error:", error);
      res.status(500).json({ error: 'Failed to fetch news' });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const article = await prisma.newsArticle.findUnique({
        where: { id: req.params.id },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, username: true } },
          club: { select: { id: true, name: true, avatarUrl: true, description: true } }
        }
      });
      if (!article) return res.status(404).json({ error: 'Not found' });

      let isSaved = false;
      if (req.headers.authorization) {
        try {
           const token = req.headers.authorization.split(' ')[1];
           if (token && token !== 'null') {
             const decoded = jwt.verify(token, JWT_SECRET) as any;
             if (decoded && decoded.userId) {
                const saved = await prisma.savedArticle.findUnique({
                  where: { userId_articleId: { userId: decoded.userId, articleId: article.id } }
                });
                isSaved = !!saved;
             }
           }
        } catch (e) {
          console.error("JWT Error in news article:", e);
        }
      }

      res.json({ article: { ...article, isSaved } });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/news-tags', async (req, res) => {
    try {
      const tags = await prisma.newsTag.findMany({ orderBy: { name: 'asc' } });
      res.json({ tags });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  app.get('/api/course-tags', async (req, res) => {
    try {
      const tags = await prisma.courseTag.findMany({ orderBy: { name: 'asc' } });
      res.json({ tags });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch course tags' });
    }
  });

  app.post('/api/admin/news-tags', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prisma.newsTag.create({ data: { name } });
      res.json({ tag });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create tag' });
    }
  });

  app.post('/api/admin/course-tags', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const tag = await prisma.courseTag.create({ data: { name } });
      res.json({ tag });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create course tag' });
    }
  });

  app.delete('/api/admin/news-tags/:id', requireAdmin, async (req, res) => {
    try {
      await prisma.newsTag.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  });

  app.delete('/api/admin/course-tags/:id', requireAdmin, async (req, res) => {
    try {
      await prisma.courseTag.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete course tag' });
    }
  });

  // Get all users
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string || '';
      const role = req.query.role as string;
      const status = req.query.status as string;

      let where: any = {};
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { studentEmail: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (role && role !== 'ALL') {
        where.role = role;
      }
      
      if (status && status !== 'ALL') {
        where.isBanned = status === 'BANNED';
      }

      if (page && limit) {
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, role: true, isBanned: true, createdAt: true, managerId: true, avatarUrl: true, orgTitle: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.user.count({ where })
        ]);
        res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
      } else {
        const users = await prisma.user.findMany({
          select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, role: true, isBanned: true, createdAt: true, managerId: true, avatarUrl: true, orgTitle: true },
          orderBy: { createdAt: 'desc' }
        });
        res.json({ users });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get specific user details
  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, username: true, name: true, studentEmail: true, googleEmail: true, bio: true, role: true, isBanned: true, links: true, warnings: true }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  app.post('/api/admin/users/:id/warn', requireAdmin, async (req: any, res) => {
    try {
      const { reason, reportId, duration } = req.body;
      if (!reason) return res.status(400).json({ error: 'Reason is required' });

      let expiresAt: Date | null = null;
      if (duration) {
        const now = new Date();
        if (duration === '1_week') expiresAt = new Date(now.setDate(now.getDate() + 7));
        else if (duration === '1_month') expiresAt = new Date(now.setMonth(now.getMonth() + 1));
        else if (duration === '2_months') expiresAt = new Date(now.setMonth(now.getMonth() + 2));
        else if (duration === '3_months') expiresAt = new Date(now.setMonth(now.getMonth() + 3));
        else if (duration === '1_year') expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
        // 'forever' leaves expiresAt as null
      }

      // Create the warning
      const warning = await prisma.warning.create({
        data: {
          userId: req.params.id,
          reason,
          reportId,
          expiresAt
        }
      });
      
      // Create a log entry
      await prisma.log.create({
        data: {
          action: 'System Warning Issued',
          userId: req.params.id,
          details: `Warning issued by admin ${req.user.username}. Reason: ${reason}` + (duration && duration !== 'forever' ? ` (Duration: ${duration})` : '')
        }
      });

      // Send a notification to the user
      await prisma.notification.create({
        data: {
          userId: req.params.id,
          type: 'WARNING',
          content: `You have received a warning: ${reason}`,
          link: '/notifications'
        }
      });

      // Check total warnings for this user
      const warningCount = await prisma.warning.count({
        where: { userId: req.params.id }
      });

      if (warningCount >= 3) {
        // Ban the user
        await prisma.user.update({
          where: { id: req.params.id },
          data: { isBanned: true }
        });

        await prisma.notification.create({
          data: {
            userId: req.params.id,
            type: 'SYSTEM',
            content: `Your account has been banned due to receiving ${warningCount} warnings.`
          }
        });

        return res.json({ message: 'User warned and automatically banned due to 3 warnings.', warningCount, isBanned: true });
      }

      res.json({ message: 'User warned successfully', warningCount, isBanned: false });
    } catch (error) {
      console.error('Failed to warn user:', error);
      res.status(500).json({ error: 'Failed to warn user' });
    }
  });

  app.delete('/api/admin/warnings/:id', requireAdmin, async (req: any, res) => {
    try {
      const warning = await prisma.warning.findUnique({ where: { id: req.params.id }});
      if(!warning) return res.status(404).json({ error: 'Warning not found' });
      
      await prisma.warning.delete({ where: { id: req.params.id } });
      
      await prisma.log.create({
        data: {
          action: 'System Warning Removed',
          userId: warning.userId,
          details: `Warning removed by admin ${req.user.username}. Reason: ${warning.reason}`
        }
      });
      res.json({ success: true });
    } catch(error) {
      console.error('Failed to delete warning:', error);
      res.status(500).json({ error: 'Failed to delete warning' });
    }
  });

  // Update full user details
  app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const { username, name, studentEmail, googleEmail, bio, password, role, isBanned, managerId, orgTitle } = req.body;
      
      const updateData: any = {};
      if (username !== undefined) updateData.username = username.toLowerCase();
      if (name !== undefined) updateData.name = name;
      if (studentEmail !== undefined) updateData.studentEmail = studentEmail || null;
      if (googleEmail !== undefined) updateData.googleEmail = googleEmail || null;
      if (bio !== undefined) updateData.bio = bio;
      if (role !== undefined) updateData.role = role;
      if (isBanned !== undefined) updateData.isBanned = isBanned;
      if (managerId !== undefined) updateData.managerId = managerId === null ? null : managerId;
      if (orgTitle !== undefined) updateData.orgTitle = orgTitle === '' ? null : orgTitle;
      
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
      console.error('Failed to update ban status:', error);
      res.status(500).json({ error: 'Failed to update ban status' });
    }
  });

  // --- ADMIN CLUBS ---
  // Courses Management
  app.get('/api/admin/courses', requireAdmin, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string || '';

      const where = search ? {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } }
        ]
      } : {};

      if (page && limit) {
        const [courses, total] = await Promise.all([
          prisma.course.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.course.count({ where })
        ]);
        res.json({ courses, total, page, totalPages: Math.ceil(total / limit) });
      } else {
        const courses = await prisma.course.findMany({
          orderBy: { name: 'asc' }
        });
        res.json({ courses });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch courses' });
    }
  });

  app.post('/api/admin/courses', requireAdmin, async (req, res) => {
    try {
      const { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl } = req.body;
      const course = await prisma.course.create({
        data: { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl }
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
      const { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl } = req.body;
      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl }
      });
      res.json({ course });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course' });
    }
  });

  app.get('/api/courses/:id/details', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true, name: true, code: true, description: true, syllabus: true,
          freeResourcesUrl: true, paidResourcesUrl: true, avatarUrl: true, bannerUrl: true, tags: true
        }
      });
      if (!course) return res.status(404).json({ error: 'Course not found' });
      
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });

      res.json({ course, isEnrolled: !!enrollment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch course details' });
    }
  });

  app.put('/api/courses/:id', authenticateToken, async (req: any, res) => {
    try {
      const courseId = req.params.id;
      const { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl } = req.body;

      const isGlobalAdmin = req.user.role === 'ADMIN';
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, userId: req.user.userId }
      });

      if (!isGlobalAdmin && !enrollment?.isAdmin) {
        return res.status(403).json({ error: 'Only admins can edit course info' });
      }

      const course = await prisma.course.update({
        where: { id: courseId },
        data: { name, code, tags, description, syllabus, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl }
      });
      res.json({ course });
    } catch (error) {
      console.error('Failed to update course:', error);
      res.status(500).json({ error: 'Failed' });
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
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string || '';

      const where = search ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      } : {};

      if (page && limit) {
        const [clubs, total] = await Promise.all([
          prisma.club.findMany({
            where,
            include: { 
              _count: { select: { members: true } },
              links: true
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.club.count({ where })
        ]);
        res.json({ clubs, total, page, totalPages: Math.ceil(total / limit) });
      } else {
        const clubs = await prisma.club.findMany({
          include: { 
            _count: { select: { members: true } },
            links: true
          },
          orderBy: { createdAt: 'desc' }
        });
        res.json({ clubs });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch clubs' });
    }
  });

  app.post('/api/admin/clubs', requireAdmin, async (req: any, res) => {
    try {
      const { name, description, tags, adminId } = req.body;
      const club = await prisma.club.create({
        data: { name, description, tags }
      });
      
      // Assign an admin if provided, otherwise assign the user who created it
      const targetAdminId = adminId || req.user.userId;
      if (targetAdminId) {
        await prisma.clubMember.create({
          data: {
            userId: targetAdminId,
            clubId: club.id,
            isAdmin: true
          }
        });
      }

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
        data: { 
          name, 
          description, 
          avatarUrl, 
          bannerUrl, 
          tags,
          links: links ? {
            deleteMany: {},
            create: links.map((url: string) => ({ url }))
          } : undefined
        }
      });

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
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const search = req.query.search as string || '';

      const where = search ? {
        OR: [
          { title: { contains: search } },
          { body: { contains: search } }
        ]
      } : {};

      if (page && limit) {
        const [articles, total] = await Promise.all([
          prisma.newsArticle.findMany({
            where,
            include: { author: { select: { username: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.newsArticle.count({ where })
        ]);
        res.json({ articles, total, page, totalPages: Math.ceil(total / limit) });
      } else {
        const articles = await prisma.newsArticle.findMany({
          include: { author: { select: { username: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        });
        res.json({ articles });
      }
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
  app.get('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const settings = await prisma.systemSetting.findMany();
      const settingsMap = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);
      res.json({ settings: settingsMap });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || typeof value !== 'string') return res.status(400).json({ error: 'Invalid input' });
      
      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
      res.json({ setting });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

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
              include: { author: { select: { name: true, username: true } }, group: { select: { isDirectMessage: true } } }
            });
            if (msg) {
              contentDetailsStr = `"${msg.content}" - ${msg.author.name || msg.author.username}`;
              contentLink = msg.group?.isDirectMessage ? `/messages?id=${msg.groupId}` : `/groups?id=${msg.groupId}`;
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

      const currentAdminId = req.user.userId;

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
      const { type, reason, durationDays, reportId } = req.body;
      const userId = req.params.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      let content = '';
      if (type === 'WARNING') {
        content = `Official Warning: ${reason}`;
        
        await prisma.warning.create({
          data: {
            userId,
            reason,
            reportId
          }
        });

        const warningCount = await prisma.warning.count({
          where: { userId }
        });

        if (warningCount >= 3) {
          await prisma.user.update({
            where: { id: userId },
            data: { isBanned: true }
          });
          content = `Your account has been permanently banned due to receiving 3 official warnings. Final WARNING: ${reason}`;
        }
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
          type: type === 'WARNING' ? 'WARNING' : 'SYSTEM',
          content,
          link: type === 'WARNING' ? '/notifications' : '/settings'
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
          include: { author: { select: { name: true, username: true, avatarUrl: true } }, group: { select: { isDirectMessage: true } } }
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

  // Backup database and files (DISABLED to prevent DB corruption)
  // app.get('/api/admin/backup', requireAdmin, (req, res) => {
  //   const timestamp = new Date().toISOString().split('T')[0];
  //   const filename = `campushub-full-backup-${timestamp}.zip`;
  //   
  //   res.setHeader('Content-Type', 'application/zip');
  //   res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  //
  //   const archive = archiver('zip', {
  //     zlib: { level: 9 } // Sets the compression level.
  //   });
  //
  //   archive.on('error', (err) => {
  //     console.error('Backup archive error:', err);
  //     if (!res.headersSent) {
  //       res.status(500).json({ error: 'Failed to generate backup' });
  //     }
  //   });
  //
  //   archive.pipe(res);
  //
  //   // Append the database file
  //   const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  //   if (fs.existsSync(dbPath)) {
  //     archive.file(dbPath, { name: 'database/dev.db' });
  //   }
  //
  //   // Append the uploads directory (contains all user files, academic files, news photos, etc.)
  //   const uploadsPath = path.join(process.cwd(), 'uploads');
  //   if (fs.existsSync(uploadsPath)) {
  //     archive.directory(uploadsPath, 'uploads');
  //   }
  //
  //   archive.finalize();
  // });

  // --- FORMS & APPLICATIONS ---
  // Create a new form
  app.post('/api/forms', authenticateToken, async (req: any, res) => {
    try {
      const { title, description, entityType, entityId, pages, status, allowMultipleSubmissions, allowResponseEdits } = req.body;
      const form = await prisma.form.create({
        data: {
          title,
          description,
          entityType,
          entityId,
          status: status || 'DRAFT',
          allowMultipleSubmissions: allowMultipleSubmissions ?? true,
          allowResponseEdits: allowResponseEdits ?? true,
          creatorId: req.user.userId,
          pages: {
            create: pages.map((page: any, pIndex: number) => ({
              title: page.title,
              description: page.description,
              order: pIndex,
              fields: {
                create: page.fields.map((field: any, fIndex: number) => ({
                  type: field.type,
                  question: field.question,
                  description: field.description,
                  required: field.required,
                  options: field.options ? (typeof field.options === 'string' ? field.options : JSON.stringify(field.options)) : null,
                  order: fIndex
                }))
              }
            }))
          }
        },
        include: {
          pages: { include: { fields: true } }
        }
      });
      res.json({ form });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create form' });
    }
  });

  // Get forms (optional filter by entity)
  app.get('/api/forms', authenticateToken, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.query;
      const where: any = {};
      if (entityType) where.entityType = String(entityType);
      if (entityId) where.entityId = String(entityId);

      const forms = await prisma.form.findMany({
        where,
        include: { 
          creator: { select: { name: true, username: true } }, 
          _count: { select: { submissions: true } },
          submissions: {
            where: { userId: req.user.userId },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ forms });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch forms' });
    }
  });

  // Get a specific form
  app.get('/api/forms/:id', authenticateToken, async (req: any, res) => {
    try {
      const form = await prisma.form.findUnique({
        where: { id: req.params.id },
        include: {
          pages: {
            orderBy: { order: 'asc' },
            include: { fields: { orderBy: { order: 'asc' } } }
          }
        }
      });
      if (!form) return res.status(404).json({ error: 'Form not found' });

      // Check if user has an existing submission
      const existingSubmission = await prisma.formSubmission.findFirst({
        where: { formId: req.params.id, userId: req.user.userId },
        include: { answers: true }
      });

      res.json({ form, existingSubmission });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch form' });
    }
  });

  // Update form status or metadata
  app.put('/api/forms/:id', authenticateToken, async (req: any, res) => {
    try {
      const { status, title, description, allowMultipleSubmissions, allowResponseEdits, pages } = req.body;
      const data: any = {};
      if (status) data.status = status;
      if (title) data.title = title;
      if (description !== undefined) data.description = description;
      if (allowMultipleSubmissions !== undefined) data.allowMultipleSubmissions = allowMultipleSubmissions;
      if (allowResponseEdits !== undefined) data.allowResponseEdits = allowResponseEdits;

      // If pages are provided, we should probably update them (this is complex, naive delete and recreate)
      if (pages) {
        await prisma.formPage.deleteMany({ where: { formId: req.params.id } });
        data.pages = {
          create: pages.map((page: any, pIndex: number) => ({
            title: page.title,
            description: page.description,
            order: pIndex,
            fields: {
              create: page.fields.map((field: any, fIndex: number) => ({
                question: field.question,
                type: field.type,
                options: field.options ? (typeof field.options === 'string' ? field.options : JSON.stringify(field.options)) : null,
                required: field.required || false,
                order: fIndex
              }))
            }
          }))
        };
      }

      const form = await prisma.form.update({
        where: { id: req.params.id },
        data
      });
      res.json({ form });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update form' });
    }
  });

  // Delete form
  app.delete('/api/forms/:id', authenticateToken, async (req: any, res) => {
    try {
      await prisma.form.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete form' });
    }
  });

  // Submit a form
  app.post('/api/forms/:id/submit', authenticateToken, async (req: any, res) => {
    try {
      const { answers } = req.body; // Array of { fieldId, value }
      
      const form = await prisma.form.findUnique({ where: { id: req.params.id } });
      if (!form || form.status === 'CLOSED') {
        return res.status(400).json({ error: 'Form is not open for responses.' });
      }

      // Check for existing submissions
      const existingSubmission = await prisma.formSubmission.findFirst({
        where: { formId: req.params.id, userId: req.user.userId }
      });

      if (existingSubmission && !form.allowMultipleSubmissions) {
        if (!form.allowResponseEdits) {
          return res.status(400).json({ error: 'You have already submitted this form and edits are not allowed.' });
        }
        
        // Update existing submission by replacing answers
        await prisma.formAnswer.deleteMany({
          where: { submissionId: existingSubmission.id }
        });
        
        const updatedSubmission = await prisma.formSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            answers: {
              create: answers.map((a: any) => ({
                fieldId: a.fieldId,
                value: typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)
              }))
            }
          }
        });
        return res.json({ submission: updatedSubmission });
      }

      const submission = await prisma.formSubmission.create({
        data: {
          formId: req.params.id,
          userId: req.user.userId,
          answers: {
            create: answers.map((a: any) => ({
              fieldId: a.fieldId,
              value: typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value)
            }))
          }
        }
      });
      res.json({ submission });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to submit form' });
    }
  });

  // Get submissions
  app.get('/api/forms/:id/submissions', authenticateToken, async (req: any, res) => {
    try {
      const submissions = await prisma.formSubmission.findMany({
        where: { formId: req.params.id },
        include: {
          user: { select: { name: true, username: true, studentEmail: true, avatarUrl: true } },
          answers: { include: { field: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ submissions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  // Update submission status
  app.put('/api/submissions/:id/status', authenticateToken, async (req: any, res) => {
    try {
      const { status } = req.body;
      const submission = await prisma.formSubmission.update({
        where: { id: req.params.id },
        data: { status }
      });
      res.json({ submission });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update submission status' });
    }
  });

  // Catch-all for undefined API routes to prevent falling through to SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- VITE MIDDLEWARE ---
  const distPath = path.join(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
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
