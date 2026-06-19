export const ELEVENLABS_SOUND_API = 'https://api.elevenlabs.io/v1/sound-generation';
export const ELEVENLABS_SOUND_MODEL = 'eleven_text_to_sound_v2';

export interface GenerateSoundOptions {
  durationSeconds?: number;
  promptInfluence?: number;
  loop?: boolean;
  outputFormat?: string;
}

export interface AmbientSoundSpec {
  id: string;
  prompt: string;
}

/** Built-in channel ambient prompts aligned with DESIGN.md color channels. */
export const BUILTIN_AMBIENT_SPECS: AmbientSoundSpec[] = [
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

export async function generateSoundEffect(
  apiKey: string,
  text: string,
  options: GenerateSoundOptions = {},
): Promise<ArrayBuffer> {
  const {
    durationSeconds = 22,
    promptInfluence = 0.5,
    loop = true,
    outputFormat = 'mp3_44100_128',
  } = options;

  const url = new URL(ELEVENLABS_SOUND_API);
  url.searchParams.set('output_format', outputFormat);

  const elResp = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      duration_seconds: durationSeconds,
      prompt_influence: promptInfluence,
      model_id: ELEVENLABS_SOUND_MODEL,
      loop,
    }),
  });

  if (!elResp.ok) {
    const errText = await elResp.text().catch(() => '');
    let message = `ElevenLabs API error (${elResp.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.detail?.message) message = errJson.detail.message;
      else if (typeof errJson?.detail === 'string') message = errJson.detail;
    } catch {
      if (errText) message = `${message}: ${errText.slice(0, 200)}`;
    }
    throw new Error(message);
  }

  return elResp.arrayBuffer();
}
