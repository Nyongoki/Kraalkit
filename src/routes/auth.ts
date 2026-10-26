import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Helper to sign user JWT
function createToken(user: { id: number; email: string; name: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      name: z.string().min(2),
      role: z.enum(['FARMER', 'VET', 'CONTRIBUTOR']).default('FARMER'),
      phone: z.string().optional(),
      county: z.string().optional(),
      farmSize: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        phone: data.phone,
        county: data.county,
        farmSize: data.farmSize,
      },
    });

    // Also sync with VetUser if role is VET so existing vet confirmation hooks work seamlessly
    if (data.role === 'VET') {
      await prisma.vetUser.upsert({
        where: { email: data.email },
        update: { name: data.name, passwordHash },
        create: { name: data.name, email: data.email, passwordHash },
      }).catch(() => {});
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        county: user.county,
        phone: user.phone,
        farmSize: user.farmSize,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const { email, password } = schema.parse(req.body);

    // 1. Check User table
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          county: user.county,
          phone: user.phone,
          farmSize: user.farmSize,
        },
      });
    }

    // 2. Fallback: check VetUser table (e.g. seeded demo vet user)
    const vetUser = await prisma.vetUser.findUnique({ where: { email } });
    if (vetUser && (await bcrypt.compare(password, vetUser.passwordHash))) {
      // Auto-upsert into User table with VET role
      const syncedUser = await prisma.user.upsert({
        where: { email: vetUser.email },
        update: {},
        create: {
          email: vetUser.email,
          name: vetUser.name,
          passwordHash: vetUser.passwordHash,
          role: 'VET',
          county: 'Kisii',
        },
      });

      const token = createToken({
        id: syncedUser.id,
        email: syncedUser.email,
        name: syncedUser.name,
        role: syncedUser.role,
      });

      return res.json({
        token,
        user: {
          id: syncedUser.id,
          email: syncedUser.email,
          name: syncedUser.name,
          role: syncedUser.role,
          county: syncedUser.county,
        },
      });
    }

    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as {
      userId: number;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        county: true,
        phone: true,
        farmSize: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
