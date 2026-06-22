#!/usr/bin/env node
/**
 * Cross-platform procedural ambient MP3 generator (Windows + macOS + Linux).
 * Requires ffmpeg on PATH. Output: public/sounds/{id}.mp3
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'sounds');
const DUR = 12;
const SR = 44100;

mkdirSync(OUT_DIR, { recursive: true });

function runFfmpeg(args, outFile) {
  const result = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args, outFile], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`ffmpeg not found. Install ffmpeg and ensure it is on PATH. (${result.error.message})`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const fadeOut = DUR - 1;
const fade = `afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOut}:d=1`;

const channels = [
  {
    name: 'rain',
    input: `anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.35`,
    af: `highpass=f=200,lowpass=f=4000,${fade}`,
  },
  {
    name: 'fire',
    input: `anoisesrc=color=brown:duration=${DUR}:sample_rate=${SR}:amplitude=0.5`,
    af: `highpass=f=80,lowpass=f=2500,tremolo=f=3:d=0.4,${fade}`,
  },
  {
    name: 'coffee',
    input: `anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.25`,
    af: `lowpass=f=800,highpass=f=100,${fade}`,
  },
  {
    name: 'waves',
    input: `anoisesrc=color=white:duration=${DUR}:sample_rate=${SR}:amplitude=0.2`,
    af: `lowpass=f=1200,tremolo=f=0.15:d=0.7,${fade}`,
  },
  {
    name: 'forest',
    input: `anoisesrc=color=pink:duration=${DUR}:sample_rate=${SR}:amplitude=0.2`,
    af: `highpass=f=300,lowpass=f=6000,${fade}`,
  },
  {
    name: 'keyboard',
    input: `anoisesrc=color=white:duration=${DUR}:sample_rate=${SR}:amplitude=0.01`,
    af: `highpass=f=2000,lowpass=f=8000,afade=t=in:st=0:d=0.1,afade=t=out:st=${fadeOut}:d=1`,
  },
];

for (const ch of channels) {
  runFfmpeg(
    ['-f', 'lavfi', '-i', ch.input, '-af', ch.af, '-codec:a', 'libmp3lame', '-q:a', '4'],
    join(OUT_DIR, `${ch.name}.mp3`),
  );
}

console.log(`Generated ambient loops in ${OUT_DIR}`);
