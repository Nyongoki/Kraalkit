import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email?: string;
    phone?: string;
    name?: string | null;
    role: string;
    county?: string | null;
  };
  farmer?: {
    id: number;
    phone: string;
    name?: string | null;
    role: string;
    county?: string | null;
  };
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return next();
    }

    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;

    if (payload.farmerId) {
      const farmer = await prisma.farmer.findUnique({
        where: { id: payload.farmerId },
      });
      if (farmer) {
        req.farmer = {
          id: farmer.id,
          phone: farmer.phone,
          name: farmer.name,
          role: farmer.role,
          county: farmer.county,
        };
        req.user = {
          id: farmer.id,
          phone: farmer.phone,
          name: farmer.name,
          role: farmer.role,
          county: farmer.county,
        };
      }
      return next();
    }

    if (payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          phone: user.phone || undefined,
          name: user.name,
          role: user.role,
          county: user.county,
        };

        const farmerPhone = (user.phone && user.phone.trim().length > 0)
          ? user.phone.trim()
          : `USR-${user.id}`;

        let farmer = await prisma.farmer.findUnique({ where: { phone: farmerPhone } });
        if (!farmer) {
          farmer = await prisma.farmer.create({
            data: {
              name: user.name,
              phone: farmerPhone,
              county: user.county,
              role: user.role,
            },
          });
        }
        req.farmer = farmer;
      }
      return next();
    }

    return next();
  } catch {
    return next();
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = auth.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as any;

    if (payload.farmerId) {
      const farmer = await prisma.farmer.findUnique({
        where: { id: payload.farmerId },
      });
      if (!farmer) return res.status(401).json({ error: 'Farmer account not found' });
      req.farmer = {
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        role: farmer.role,
        county: farmer.county,
      };
      req.user = {
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        role: farmer.role,
        county: farmer.county,
      };
      return next();
    }

    if (payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user) return res.status(401).json({ error: 'User account not found' });
      req.user = {
        id: user.id,
        email: user.email,
        phone: user.phone || undefined,
        name: user.name,
        role: user.role,
        county: user.county,
      };

      // Always link or create a Farmer record so breeding ledger and events work seamlessly
      const farmerPhone = (user.phone && user.phone.trim().length > 0)
        ? user.phone.trim()
        : `USR-${user.id}`;

      let farmer = await prisma.farmer.findUnique({ where: { phone: farmerPhone } });
      if (!farmer) {
        farmer = await prisma.farmer.create({
          data: {
            name: user.name,
            phone: farmerPhone,
            county: user.county,
            role: user.role,
          },
        });
      }
      req.farmer = farmer;
      return next();
    }

    return res.status(401).json({ error: 'Invalid token payload' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
}
