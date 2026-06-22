// Cached at module scope — WebGL support doesn't change at runtime.
let _webglSupportCache: boolean | null = null;

type WebGLCtx = WebGLRenderingContext | WebGL2RenderingContext;

function probeContext(
  canvas: HTMLCanvasElement,
  failIfMajorPerformanceCaveat: boolean,
): WebGLCtx | null {
  const options = { failIfMajorPerformanceCaveat };
  return (
    (canvas.getContext('webgl2', options) as WebGL2RenderingContext | null) ??
    (canvas.getContext('webgl', options) as WebGLRenderingContext | null)
  );
}

/**
 * Probe WebGL availability without leaking a context.
 * Tries the GPU path first, then allows software rendering. On Windows,
 * failIfMajorPerformanceCaveat alone often returns null (SwiftShader off,
 * hybrid GPU, RDP) even though a usable context exists without the flag.
 */
export function canUseWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  if (_webglSupportCache !== null) return _webglSupportCache;

  try {
    const testCanvas = document.createElement('canvas');
    const gl =
      probeContext(testCanvas, true) ?? probeContext(testCanvas, false);
    _webglSupportCache = !!gl;

    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }

    return _webglSupportCache;
  } catch {
    _webglSupportCache = false;
    return false;
  }
}

/** Test helper — reset module cache between assertions. */
export function resetWebGLSupportCacheForTests(): void {
  _webglSupportCache = null;
}
