import express from 'express';
import cors from 'cors';
import v1Router from './routes/index.ts';
import { checkMLServiceHealth } from './services/prediction.service.ts';

const app = express();

const PORT = Number(process.env.PORT ?? 3000);

// CORS: comma-separated allowlist in production (e.g. the frontend origin).
// Unset in development => allow all origins.
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    : true;

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

/**
 * Liveness/readiness probe for deploy platforms. Always returns 2xx while
 * the process is up; dependency status (ML service) is reported in the body
 * so platform health checks stay green even when an upstream is degraded.
 */
app.get('/health', async (_req, res) => {
    const mlHealthy = await checkMLServiceHealth();

    res.json({
        status: 'ok',
        service: 'trace-backend',
        port: PORT,
        mlService: mlHealthy ? 'ok' : 'unreachable',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/v1', v1Router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});