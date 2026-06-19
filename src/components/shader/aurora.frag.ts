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

  // Permutation helpers for simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p, int octaves) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      val += snoise(p * freq) * amp;
      freq *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);

    vec2 mouseOffset = (u_mouse - 0.5) * (0.04 + u_masterEnergy * 0.06);

    float audioDrive = clamp(u_masterEnergy * 1.4, 0.0, 1.0);
    float t = u_time * (0.15 + audioDrive * 0.55);

    vec3 base0 = vec3(0.03, 0.05, 0.15);
    vec3 base1 = vec3(0.02, 0.08, 0.05);
    vec3 base2 = vec3(0.10, 0.07, 0.02);
    vec3 base3 = vec3(0.01, 0.01, 0.03);

    vec2 warp = vec2(0.0);
    float warpWeight = 0.0;
    for (int i = 0; i < 6; i++) {
      float drive = u_channelVolumes[i] * (0.5 + u_channelEnergy[i] * 1.5);
      float angle = float(i) * 1.047 + t * 0.2;
      vec2 offset = vec2(cos(angle), sin(angle)) * drive * 0.18;
      warp += offset;
      warpWeight += drive;
    }
    for (int i = 0; i < 4; i++) {
      float drive = u_customVolumes[i] * (0.5 + u_customEnergy[i] * 1.5);
      float angle = float(i) * 1.57 + t * 0.35;
      vec2 offset = vec2(sin(angle), cos(angle)) * drive * 0.22;
      warp += offset;
      warpWeight += drive;
    }
    if (warpWeight > 0.001) warp /= warpWeight;
    vec2 warpedUv = uv + mouseOffset + warp;

    int octaves = int(clamp(3.0 + audioDrive * 2.0, 3.0, 5.0));

    vec3 p1 = vec3(warpedUv * aspect * (1.2 + audioDrive * 0.4) + vec2(t * 0.3, t * 0.1), t);
    float n1 = fbm(p1, octaves);

    vec3 p2 = vec3(warpedUv * aspect * 0.8 + vec2(-t * 0.15, t * 0.25), t * 1.3);
    float n2 = fbm(p2, max(octaves - 1, 2));

    vec3 p3 = vec3(warpedUv * aspect * (2.5 + audioDrive) + vec2(t * 0.05, -t * 0.2), t * 0.7);
    float n3 = fbm(p3, 2);

    float combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    combined = combined * 0.5 + 0.5;

    vec3 baseColor = mix(base3, base0, smoothstep(0.0, 0.4, combined));
    baseColor = mix(baseColor, base1, smoothstep(0.3, 0.6, combined) * 0.6);
    baseColor = mix(baseColor, base2, smoothstep(0.55, 0.85, combined) * 0.4);

    float totalChannelWeight = 0.0;
    vec3 channelBlend = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float vol = u_channelVolumes[i];
      float energy = u_channelEnergy[i];
      float weight = vol * vol * (1.0 + energy * 2.5);
      channelBlend += u_channelColors[i] * weight;
      totalChannelWeight += weight;
    }
    for (int i = 0; i < 4; i++) {
      float vol = u_customVolumes[i];
      float energy = u_customEnergy[i];
      float weight = vol * vol * (1.0 + energy * 2.5);
      channelBlend += u_customColors[i] * weight;
      totalChannelWeight += weight;
    }
    if (totalChannelWeight > 0.001) {
      channelBlend /= totalChannelWeight;
    }

    float noiseMask = smoothstep(0.28, 0.78, combined);
    float channelStrength = totalChannelWeight > 0.001
      ? clamp(totalChannelWeight * (0.55 + audioDrive * 0.35), 0.0, 0.85)
      : 0.0;
    vec3 colorWithChannels = mix(baseColor, channelBlend * 0.55, noiseMask * channelStrength);

    for (int i = 0; i < 6; i++) {
      float bloom = u_channelVolumes[i] * u_channelEnergy[i];
      if (bloom > 0.02) {
        float peak = smoothstep(0.5, 0.72, combined) * smoothstep(0.9, 0.55, combined + 0.35);
        colorWithChannels += u_channelColors[i] * peak * bloom * 0.45;
      }
    }
    for (int i = 0; i < 4; i++) {
      float bloom = u_customVolumes[i] * u_customEnergy[i];
      if (bloom > 0.02) {
        float peak = smoothstep(0.45, 0.68, combined) * smoothstep(0.88, 0.5, combined + 0.3);
        colorWithChannels += u_customColors[i] * peak * bloom * 0.55;
      }
    }

    float glowMask = smoothstep(0.58, 0.82, combined) * smoothstep(0.86, 0.58, combined + 0.28);
    vec3 glowColor = channelBlend * 1.1;
    colorWithChannels += glowColor * glowMask * channelStrength * (0.45 + audioDrive * 0.55);

    float pulse = sin(t * (4.0 + audioDrive * 6.0)) * 0.5 + 0.5;
    float dist = length((uv - 0.5) * aspect);
    float ring = smoothstep(0.35 + pulse * 0.08, 0.32 + pulse * 0.08, dist)
               * smoothstep(0.08, 0.14, dist);
    colorWithChannels += channelBlend * ring * audioDrive * 0.25;

    float brightness = mix(0.45, 1.0, u_journeyProgress) * (1.0 + audioDrive * 0.22);
    float saturation = mix(0.5, 1.0, u_journeyProgress) * (1.0 + audioDrive * 0.15);
    vec3 grey = vec3(dot(colorWithChannels, vec3(0.299, 0.587, 0.114)));
    vec3 finalColor = mix(grey, colorWithChannels, saturation) * brightness;

    vec2 vigUv = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(vigUv * vec2(0.6, 0.8), vigUv * vec2(0.6, 0.8));
    vignette = clamp(vignette, 0.0, 1.0);
    finalColor *= mix(0.5, 1.0, vignette);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
