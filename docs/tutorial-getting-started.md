# Getting started with FocusMixr

FocusMixr is an ambient sound mixer with a reactive aurora background. In this tutorial you install the app locally, start your first focus session, and blend built-in sounds. By the end you will have a working mix and understand the basic UI flow.

## What you'll need

- **Node.js 20** (matches CI and the Docker image)
- **npm** (ships with Node)
- A modern browser with Web Audio support (Chrome, Firefox, Safari, Edge)

Optional: an [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys) if you want Aura Forge AI sound generation later. Built-in channels work without it.

## Step 1: Install and run

Clone the repo, install dependencies, and start the dev server:

```bash
git clone <your-repo-url> focusmixr
cd focusmixr
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the hero heading **Shape your environment.** and a **Start Journey** button over the aurora background.

## Step 2: Start your first focus session

Click **Start Journey** (or use the nav button). The hero fades out over 1.2 seconds and the glass **mixer dock** slides up from the bottom.

The dock contains:

- **Master control** (left) — play/pause and master volume
- **Six built-in channels** — Rain, Fire, Coffee, Waves, Forest, Keyboard
- **Forge** button (right) — opens Aura Forge for AI-generated sounds (requires API key)

## Step 3: Enable a sound

Toggle **Rain** on using the channel switch. The aurora shifts toward blue as volume increases. Adjust the vertical slider to taste (default channel volume is 0.7).

Add **Fire** or **Waves** and blend multiple channels. Each active channel drives both audio level and shader color intensity.

## Step 4: Control the mix

- **Play/Pause** — suspends or resumes the Web Audio context (master pause mutes all channels)
- **Master volume** — scales the entire mix (default 0.85)
- **Per-channel slider** — 0.0 to 1.0, exponential ramp (~80 ms)

Your channel settings persist in browser localStorage (`focusmixr-mix-v1`) across reloads. Channel on/off state and volumes are restored automatically.

## What you built

You now have a local FocusMixr instance with a working ambient mix. The app uses pre-built MP3 loops in `public/sounds/` — no API key required for built-in channels.

### Next steps

| Goal | Doc |
|------|-----|
| Generate or refresh ambient MP3s | [How to generate ambient sounds](./how-to-generate-ambient-sounds.md) |
| Configure ElevenLabs for Aura Forge | [Reference: Configuration](./reference-configuration.md) |
| Understand audio and shader design | [Explanation: Architecture](./explanation-architecture.md) |
| Run smoke tests | [How to run tests](./how-to-run-tests.md) |
