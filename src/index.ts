import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import languagesRouter from './routes/languages';
import speciesRouter from './routes/species';
import symptomsRouter from './routes/symptoms';
import vetsRouter from './routes/vets';
import rationRouter from './routes/ration';
import termsRouter from './routes/terms';
import reportsRouter from './routes/reports';
import authRouter from './routes/auth';
import strawRouter from './routes/straw';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/languages', languagesRouter);
app.use('/api/species', speciesRouter);
app.use('/api/symptoms', symptomsRouter);
app.use('/api/vets', vetsRouter);
app.use('/api/ration', rationRouter);
app.use('/api/terms', termsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api', strawRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if available
const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🐄 Livestock Health API & Frontend running on port ${PORT}`);
});

export default app;
