// setup.ts — wait for all services to be healthy before running tests
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api/v1';
const ML_URL      = process.env.ML_URL      || 'http://localhost:8000';
const MAX_WAIT_MS = 120_000; // 2 minutes
const POLL_MS     = 3_000;

async function waitForService(name: string, url: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      await axios.get(url, { timeout: 5000 });
      console.log(`✅ ${name} is ready (${url})`);
      return;
    } catch {
      process.stdout.write(`⏳ Waiting for ${name}...`);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
  throw new Error(`❌ ${name} did not become ready within ${MAX_WAIT_MS / 1000}s`);
}

module.exports = async () => {
  console.log('\n🚀 CoverAI E2E Test Suite — Waiting for services...\n');
  await Promise.all([
    waitForService('Backend (NestJS)',   `${BACKEND_URL}/health/ping`),
    waitForService('ML Service (FastAPI)', `${ML_URL}/health/ping`),
  ]);
  console.log('\n✅ All services ready. Starting tests...\n');
};
