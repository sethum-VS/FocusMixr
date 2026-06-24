import { NextRequest, NextResponse } from 'next/server';
import { generateSoundEffect } from '@/lib/elevenlabsSound';

// Simple in-memory rate limiter (per IP, dev-only)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function normalizeApiKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  const apiKey = normalizeApiKey(process.env.ELEVENLABS_API_KEY);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY is not configured on the server.' },
      { status: 401 }
    );
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429 });
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  if (prompt.length > 500) {
    return NextResponse.json({ error: 'prompt must be 500 characters or fewer' }, { status: 400 });
  }

  try {
    const audioBytes = await generateSoundEffect(apiKey, prompt, {
      durationSeconds: 22,
      promptInfluence: 0.5,
      loop: true,
    });

    return new Response(audioBytes, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBytes.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('generate-sound route error:', message);
    const status = message.includes('429') ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
