const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

// Helper to replace exactly
function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

// 1. Updating Club Settings (app.put('/api/clubs/:id'))
server = server.replace(
  `app.put('/api/clubs/:id', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.put('/api/clubs/:id', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_settings'))) {`
);

// 2. Post News (app.post('/api/clubs/:id/articles'))
server = server.replace(
  `app.post('/api/clubs/:id/articles', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.post('/api/clubs/:id/articles', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          userId_clubId: { userId: req.user.userId, clubId: req.params.id }
        },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {`
);

// 3. Edit News (app.put('/api/clubs/:id/articles/:articleId'))
server = server.replace(
  `app.put('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.put('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {`
);

// 4. Archive News
server = server.replace(
  `app.patch('/api/clubs/:id/articles/:articleId/archive', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.patch('/api/clubs/:id/articles/:articleId/archive', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {`
);

// 5. Delete News
server = server.replace(
  `app.delete('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.delete('/api/clubs/:id/articles/:articleId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_news'))) {`
);

// 6. View/Manage Members
server = server.replace(
  `app.get('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.get('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {`
);
server = server.replace(
`      const members = await prisma.clubMember.findMany({
        where: { clubId: req.params.id },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true, bio: true, studentEmail: true, googleEmail: true, createdAt: true, links: true }
          }
        }
      });`,
`      const members = await prisma.clubMember.findMany({
        where: { clubId: req.params.id },
        include: {
          role: true,
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true, bio: true, studentEmail: true, googleEmail: true, createdAt: true, links: true }
          }
        }
      });`
);

// 7. Add Member
server = server.replace(
  `app.post('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.post('/api/clubs/:id/members', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {`
);

// 8. Remove Member
server = server.replace(
  `app.delete('/api/clubs/:id/members/:userId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.delete('/api/clubs/:id/members/:userId', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {`
);

// 9. Change Role
server = server.replace(
  `app.put('/api/clubs/:id/members/:userId/role', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } }
      });
      
      if (!membership || !membership.isAdmin) {`,
  `app.put('/api/clubs/:id/members/:userId/role', authenticateToken, async (req: any, res) => {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: { userId_clubId: { userId: req.user.userId, clubId: req.params.id } },
        include: { role: true }
      });
      
      if (!membership || (!membership.isAdmin && !membership.role?.permissions.includes('manage_members'))) {`
);

server = server.replace(
`      const { isAdmin, roleTitle, managerId } = req.body;
      
      const updateData: any = {};
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
      if (roleTitle !== undefined) updateData.roleTitle = roleTitle === '' ? null : roleTitle;
      if (managerId !== undefined) updateData.managerId = managerId === null ? null : managerId;`,
`      const { isAdmin, roleTitle, managerId, roleId } = req.body;
      
      const updateData: any = {};
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
      if (roleTitle !== undefined) updateData.roleTitle = roleTitle === '' ? null : roleTitle;
      if (roleId !== undefined) updateData.roleId = roleId === null ? null : roleId;
      if (managerId !== undefined) updateData.managerId = managerId === null ? null : managerId;`
);

fs.writeFileSync('server.ts', server);
console.log('auth patched');
