#!/usr/bin/env node
/**
 * Pre-generate built-in ambient loops via ElevenLabs Sound Effects API.
 * Saves MP3s to public/sounds/ for real-time Web Audio playback.
 *
 * Requires ELEVENLABS_API_KEY in .env or .env.local (not committed).
 * Usage: npm run generate:ambient
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'sounds');

const ELEVENLABS_SOUND_API = 'https://api.elevenlabs.io/v1/sound-generation';
const MODEL_ID = 'eleven_text_to_sound_v2';
const DURATION_SECONDS = 22;
const PROMPT_INFLUENCE = 0.5;

const AMBIENT_SPECS = [
  {
    id: 'rain',
    prompt:
      'Gentle steady rain ambience, soft droplets on a window, calm atmospheric background, seamless loop',
  },
  {
    id: 'fire',
    prompt:
      'Crackling fireplace ambience, warm wood fire burning softly, cozy atmospheric background, seamless loop',
  },
  {
    id: 'coffee',
    prompt:
      'Coffee shop ambience, low muffled chatter and espresso machine hum, warm indoor background, seamless loop',
  },
  {
    id: 'waves',
    prompt:
      'Calm ocean waves gently washing on a sandy shore, peaceful beach ambience, seamless loop',
  },
  {
    id: 'forest',
    prompt:
      'Peaceful forest ambience, soft birds and light wind through trees, natural background, seamless loop',
  },
  {
    id: 'keyboard',
    prompt:
      'Soft mechanical keyboard typing, rhythmic key clicks for focus, subtle loopable background',
  },
];

async function loadApiKey() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = await readFile(join(ROOT, file), 'utf8');
      for (const line of raw.split('\n')) {
        const match = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
        if (match?.[1]) return match[1].replace(/^["']|["']$/g, '');
      }
    } catch {
      /* try next file */
    }
  }
  return process.env.ELEVENLABS_API_KEY ?? '';
}

async function generateSound(apiKey, text) {
  const url = new URL(ELEVENLABS_SOUND_API);
  url.searchParams.set('output_format', 'mp3_44100_128');

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      duration_seconds: DURATION_SECONDS,
      prompt_influence: PROMPT_INFLUENCE,
      model_id: MODEL_ID,
      loop: true,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`ElevenLabs ${resp.status}: ${errText.slice(0, 300)}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

async function main() {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('Missing ELEVENLABS_API_KEY. Add it to .env or .env.local.');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const specs = only.length
    ? AMBIENT_SPECS.filter((s) => only.includes(s.id))
    : AMBIENT_SPECS;

  if (only.length && specs.length === 0) {
    console.error(`Unknown sound id(s): ${only.join(', ')}`);
    console.error(`Valid ids: ${AMBIENT_SPECS.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`Generating ${specs.length} ambient loop(s) via ElevenLabs → ${OUT_DIR}`);

  for (const spec of specs) {
    const outPath = join(OUT_DIR, `${spec.id}.mp3`);
    process.stdout.write(`  ${spec.id}… `);
    try {
      const audio = await generateSound(apiKey, spec.prompt);
      await writeFile(outPath, audio);
      console.log(`saved (${(audio.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.log('FAILED');
      console.error(`    ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log('Done. Restart dev server if running to pick up new files.');
  }
}

main();
