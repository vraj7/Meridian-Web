/** True when running on Vercel serverless (read-only FS, no cron/WebSocket). */
export const isVercel = Boolean(process.env.VERCEL);
