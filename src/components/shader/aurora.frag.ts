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

  void main() {
    vec2 uv = vUv;

    // Audio drive (0 = silent, 1 = peak energy)
    float audioDrive = clamp(u_masterEnergy * 2.2, 0.0, 1.0);

    // Time advances faster with audio energy (base ×0.15 matching design spec)
    float t = u_time * (0.15 + audioDrive * 0.32);

    // --- Audio-driven domain warp from active channels ---
    vec2  warp       = vec2(0.0);
    float warpWeight = 0.0;
    for (int i = 0; i < 6; i++) {
      float drive = u_channelVolumes[i] * (0.5 + u_channelEnergy[i] * 2.0);
      float angle = float(i) * 1.047 + t * 0.30;
      warp       += vec2(cos(angle), sin(angle)) * drive * 0.10;
      warpWeight += u_channelVolumes[i];
    }
    for (int i = 0; i < 4; i++) {
      float drive = u_customVolumes[i] * (0.5 + u_customEnergy[i] * 2.0);
      float angle = float(i) * 1.571 + t * 0.45;
      warp       += vec2(sin(angle), cos(angle)) * drive * 0.12;
      warpWeight += u_customVolumes[i];
    }
    if (warpWeight > 0.001) warp /= warpWeight;

    vec2 wuv = uv + warp;

    // --- Organic layered noise (user's design aesthetic) ---
    float n1 = snoise(wuv * 1.5 + t);
    float n2 = snoise(wuv * 2.5 - t * 0.8 + n1);  // domain-warped by n1
    float n3 = snoise(wuv * 0.5 + t * 0.4);

    // Base palette: deep oceanic blues, forest greens, warm amber, true black
    vec3 color1 = vec3(0.01, 0.05, 0.15);  // Deep Blue
    vec3 color2 = vec3(0.02, 0.12, 0.08);  // Forest Green
    vec3 color3 = vec3(0.18, 0.08, 0.02);  // Warm Amber
    vec3 color4 = vec3(0.00, 0.00, 0.00);  // True Black

    float m1 = smoothstep(-1.0, 1.0, n1);
    float m2 = smoothstep(-1.0, 1.0, n2);
    float m3 = smoothstep(-1.0, 1.0, n3);

    vec3 color = mix(color1, color2, m1);
    color = mix(color, color3, m2 * 0.4);
    color = mix(color, color4, m3 * 0.3);

    // Subtle noise-driven brightness variation (from original design)
    color += 0.05 * n2;

    // --- Channel color accumulation: active sounds tint the palette ---
    float totalWeight  = 0.0;
    vec3  channelTint  = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float w = u_channelVolumes[i] * u_channelVolumes[i] * (1.0 + u_channelEnergy[i] * 3.5);
      channelTint  += u_channelColors[i] * w;
      totalWeight  += w;
    }
    for (int i = 0; i < 4; i++) {
      float w = u_customVolumes[i] * u_customVolumes[i] * (1.0 + u_customEnergy[i] * 3.5);
      channelTint  += u_customColors[i] * w;
      totalWeight  += w;
    }
    if (totalWeight > 0.001) {
      channelTint /= totalWeight;
    } else {
      // Idle default: deep indigo so the canvas is never totally flat
      channelTint = vec3(0.10, 0.14, 0.40);
    }

    // Blend channel tint into the organic layers — rides the noise mask
    float tintStrength = clamp(totalWeight * (0.28 + audioDrive * 0.38), 0.0, 0.52);
    color = mix(color, color * 0.45 + channelTint * 0.55, tintStrength * m1);

    // Beat-reactive brightness flash
    color += channelTint * audioDrive * 0.07;

    // --- Journey progress: fade in from near-black, boost saturation ---
    float brightness = mix(0.32, 1.22, u_journeyProgress) * (1.0 + audioDrive * 0.22);
    float saturation = mix(0.48, 1.06, u_journeyProgress);
    vec3 grey   = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    color = mix(grey, color, saturation) * brightness;

    // --- Subtle vignette (spotlight center) ---
    vec2  vigUv  = uv * 2.0 - 1.0;
    float vign   = 1.0 - dot(vigUv * vec2(0.50, 0.70), vigUv * vec2(0.50, 0.70));
    color *= mix(0.22, 1.0, clamp(vign, 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
  }
`;
