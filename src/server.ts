import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import routes from './routes';
import providerRoutes from './providers/routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '60'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', limiter);

// API routes
app.use('/api', routes);
app.use('/api/providers', providerRoutes);

// Never let unknown API paths fall through to the documentation HTML.
// This also makes missing/un-deployed endpoints fail loudly as JSON instead
// of appearing to return a successful HTML page to API clients.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static docs/tester
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all → docs
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Keep-alive: on Render's free tier the service sleeps after ~15 min without
// inbound traffic, and every cold start also wipes the in-memory caches.
// Ping our own public URL every 10 minutes so the service (and its caches)
// stay warm. RENDER_EXTERNAL_URL is provided by Render automatically.
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL).catch(() => {});
  }, 10 * 60 * 1000);
}

if (!process.env.VERCEL) app.listen(PORT, () => {
  console.log(`\n🟢 AniVault API running on http://localhost:${PORT}`);
  console.log(`📄 Docs + Tester: http://localhost:${PORT}/`);
  console.log(`🔗 API base:      http://localhost:${PORT}/api\n`);

});

export default app;
