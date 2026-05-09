const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

// 1. Add `roles: true` to `/api/clubs/:id` isManageCall
server = server.replace(
  `links: true,
            articles: {`,
  `roles: true,
            links: true,
            articles: {`
);

// 2. Add endpoints for /api/clubs/:id/roles
const rolesEndpoints = `
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
`;

// Find where to insert it: near app.get('/api/clubs/:id/image-history'
server = server.replace(
  `app.get('/api/clubs/:id/image-history', authenticateToken, async (req: any, res) => {`,
  `${rolesEndpoints}\n  app.get('/api/clubs/:id/image-history', authenticateToken, async (req: any, res) => {`
);

// 3. Let's fix the authorization checks to check for permissions if not isAdmin.
// We'll run regex to replace `const membership = await prisma.clubMember.findUnique({` inside the routes with:
// `const membership = await prisma.clubMember.findUnique({ where: { ... }, include: { role: true } })`
// Wait, regex might be tricky.

fs.writeFileSync('server.ts', server);
console.log('patched');
