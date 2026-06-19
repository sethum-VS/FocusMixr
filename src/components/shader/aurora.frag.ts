export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec3 u_channelColors[6];
  uniform float u_channelVolumes[6];
  uniform float u_channelEnergy[6];
  uniform vec3 u_customColors[4];
  uniform float u_customVolumes[4];
  uniform float u_customEnergy[4];
  uniform float u_masterEnergy;
  uniform float u_journeyProgress;

  // Water-drop ripple — ring buffer of 3 concurrent drops
  uniform vec2  u_dropPos[3];
  uniform float u_dropBirthTime[3];
  uniform float u_dropStrength[3];

  varying vec2 vUv;

  // --- 2D Simplex noise ---
  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  0.366025403784439,
                       -0.577350269189626,  0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1  = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy  -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  vec2 channelAnchor(int i) {
    if (i == 0) return vec2(0.18, 0.38);
    if (i == 1) return vec2(0.82, 0.32);
    if (i == 2) return vec2(0.28, 0.72);
    if (i == 3) return vec2(0.72, 0.68);
    if (i == 4) return vec2(0.50, 0.20);
    return vec2(0.50, 0.82);
  }

  vec2 customAnchor(int i) {
    if (i == 0) return vec2(0.35, 0.48);
    if (i == 1) return vec2(0.65, 0.48);
    if (i == 2) return vec2(0.42, 0.58);
    return vec2(0.58, 0.58);
  }

  void main() {
    vec2 uv = vUv;

    // Calm audio drive — smoothstep removes micro-jitter at low energy
    float rawDrive = clamp(u_masterEnergy * 0.85, 0.0, 1.0);
    float audioDrive = smoothstep(0.04, 0.55, rawDrive);

    // Time barely responds to audio — slow organic drift
    float t = u_time * (0.12 + audioDrive * 0.04);

    // --- Audio-driven domain warp — very gentle ---
    vec2  warp       = vec2(0.0);
    float warpWeight = 0.0;
    for (int i = 0; i < 6; i++) {
      float drive = u_channelVolumes[i] * (0.45 + u_channelEnergy[i] * 0.35);
      float angle = float(i) * 1.047 + t * 0.18;
      warp       += vec2(cos(angle), sin(angle)) * drive * 0.022;
      warpWeight += u_channelVolumes[i];
    }
    for (int i = 0; i < 4; i++) {
      float drive = u_customVolumes[i] * (0.45 + u_customEnergy[i] * 0.35);
      float angle = float(i) * 1.571 + t * 0.22;
      warp       += vec2(sin(angle), cos(angle)) * drive * 0.028;
      warpWeight += u_customVolumes[i];
    }
    if (warpWeight > 0.001) warp /= warpWeight;

    vec2 wuv = uv + warp;

    // --- Organic layered noise (unchanged) ---
    float n1 = snoise(wuv * 1.5 + t);
    float n2 = snoise(wuv * 2.5 - t * 0.8 + n1);
    float n3 = snoise(wuv * 0.5 + t * 0.4);

    // Base palette
    vec3 color1 = vec3(0.01, 0.05, 0.15);
    vec3 color2 = vec3(0.02, 0.12, 0.08);
    vec3 color3 = vec3(0.18, 0.08, 0.02);
    vec3 color4 = vec3(0.00, 0.00, 0.00);

    float m1 = smoothstep(-1.0, 1.0, n1);
    float m2 = smoothstep(-1.0, 1.0, n2);
    float m3 = smoothstep(-1.0, 1.0, n3);

    vec3 color = mix(color1, color2, m1);
    color = mix(color, color3, m2 * 0.4);
    color = mix(color, color4, m3 * 0.3);
    color += 0.05 * n2;

    // --- Channel color accumulation ---
    float totalWeight = 0.0;
    vec3  channelTint = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float w = u_channelVolumes[i] * u_channelVolumes[i] * (1.0 + u_channelEnergy[i] * 0.55);
      channelTint  += u_channelColors[i] * w;
      totalWeight  += w;
    }
    for (int i = 0; i < 4; i++) {
      float w = u_customVolumes[i] * u_customVolumes[i] * (1.0 + u_customEnergy[i] * 0.55);
      channelTint  += u_customColors[i] * w;
      totalWeight  += w;
    }
    if (totalWeight > 0.001) {
      channelTint /= totalWeight;
    } else {
      channelTint = vec3(0.10, 0.14, 0.40);
    }

    // --- Spatial color blobs — each sound paints a visible region that blends where they overlap ---
    vec3  spatialAccum = vec3(0.0);
    float spatialWeight = 0.0;
    float activeCount   = 0.0;

    for (int i = 0; i < 6; i++) {
      float vol = u_channelVolumes[i];
      if (vol > 0.025) {
        vec2  toAnchor = uv - channelAnchor(i);
        float dist     = length(toAnchor);
        float edge     = 0.38 + 0.14 * snoise(uv * 2.2 + t * 0.45 + float(i) * 1.9);
        float blob     = smoothstep(edge, 0.0, dist) * vol * vol * (0.7 + u_channelEnergy[i] * 0.3);
        spatialAccum  += u_channelColors[i] * blob;
        spatialWeight += blob;
        activeCount  += 1.0;
      }
    }
    for (int i = 0; i < 4; i++) {
      float vol = u_customVolumes[i];
      if (vol > 0.025) {
        float dist = length(uv - customAnchor(i));
        float edge = 0.32 + 0.12 * snoise(uv * 2.4 + t * 0.55 + float(i) * 2.3);
        float blob = smoothstep(edge, 0.0, dist) * vol * vol * (0.7 + u_customEnergy[i] * 0.3);
        spatialAccum  += u_customColors[i] * blob;
        spatialWeight += blob;
        activeCount  += 1.0;
      }
    }

    if (spatialWeight > 0.001) {
      vec3 spatialMix = spatialAccum / spatialWeight;
      float multiBoost = 1.0 + max(0.0, activeCount - 1.0) * 0.12;
      float blendAmt   = clamp(sqrt(spatialWeight) * 0.62 * multiBoost, 0.0, 0.78);
      vec3 screenBlend = 1.0 - (1.0 - color) * (1.0 - spatialMix * blendAmt);
      color = mix(color, screenBlend, blendAmt * (0.5 + m1 * 0.5));
    }

    float tintStrength = clamp(totalWeight * (0.32 + audioDrive * 0.22), 0.0, 0.52);
    color = mix(color, color * 0.38 + channelTint * 0.62, tintStrength * m1);

    color += channelTint * audioDrive * 0.022;

    // --- Water-drop ripples (soft dissolve) ---
    for (int i = 0; i < 3; i++) {
      float elapsed = (u_time - u_dropBirthTime[i]) * 0.10;
      if (elapsed > 0.0 && elapsed < 1.8) {
        float dist = length(uv - u_dropPos[i]);

        float wavefront = elapsed * 0.55;
        float ringDist  = dist - wavefront;
        float decay     = exp(-elapsed * 1.1);

        float ring  = exp(-ringDist * ringDist * 120.0) * decay;
        float ring2 = exp(-(ringDist + 0.08) * (ringDist + 0.08) * 120.0) * decay * 0.22;
        float ring3 = exp(-(ringDist + 0.16) * (ringDist + 0.16) * 120.0) * decay * 0.08;
        float pulse = exp(-dist * dist * 22.0) * exp(-elapsed * 6.0);

        float ripple = (ring + ring2 + ring3 + pulse) * u_dropStrength[i];
        // Ripples carry the live mixed tint — reinforces color-of-sound feedback
        color += channelTint * ripple * 0.22;
      }
    }

    float brightness = mix(0.32, 1.22, u_journeyProgress) * (1.0 + audioDrive * 0.04);
    float saturation = mix(0.48, 1.06, u_journeyProgress);
    vec3 grey   = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    color = mix(grey, color, saturation) * brightness;

    // --- Subtle vignette ---
    vec2  vigUv = uv * 2.0 - 1.0;
    float vign  = 1.0 - dot(vigUv * vec2(0.50, 0.70), vigUv * vec2(0.50, 0.70));
    color *= mix(0.22, 1.0, clamp(vign, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;
