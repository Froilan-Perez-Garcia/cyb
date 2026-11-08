import { getHue, unitRgb } from './accent'

type Options = { mobile: boolean }

export type ParticleField = {
  resize: () => void
  pointer: (x: number, y: number) => void
  tilt: (x: number, y: number) => void
  destroy: () => void
}

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }
type Pair = { read: Target; write: Target; swap: () => void }
type Program = { id: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

const FOV = (30 * Math.PI) / 180
const CAMERA_Z = 6
const SHAPE_RADIUS = 0.46
const SIDE_BY_SIDE_MIN = 1024

const HASH = `
vec4 hash4(vec2 uv) {
  float s = dot(uv, vec2(127.1, 311.7));
  return fract(sin(vec4(s, s + 1.7, s + 3.1, s + 5.3)) * vec4(43758.5453, 21345.6789, 35791.234, 12345.678));
}
`

const QUAD_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FS_HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 outColor;
`

const SPLAT_FS = `${FS_HEAD}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec2 v = texture(uTarget, vUv).xy + splat.xy;
  outColor = vec4(clamp(v, -120.0, 120.0), splat.z, 1.0);
}`

const ADVECT_FS = `${FS_HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  vec2 v = uDissipation * texture(uSource, coord).xy;
  bvec2 ok = lessThan(abs(v), vec2(1e4));
  outColor = vec4(ok.x ? v.x : 0.0, ok.y ? v.y : 0.0, 0.0, 1.0);
}`

const CURL_FS = `${FS_HEAD}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`

const VORTICITY_FS = `${FS_HEAD}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uDt;
void main() {
  float L = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uStrength * C;
  force.y *= -1.0;
  vec2 vel = texture(uVelocity, vUv).xy + force * uDt;
  outColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
}`

const DIVERGENCE_FS = `${FS_HEAD}
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  vec2 C = texture(uVelocity, vUv).xy;
  float L = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  if (vUv.x - uTexel.x < 0.0) L = -C.x;
  if (vUv.x + uTexel.x > 1.0) R = -C.x;
  if (vUv.y + uTexel.y > 1.0) T = -C.y;
  if (vUv.y - uTexel.y < 0.0) B = -C.y;
  outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`

const PRESSURE_FS = `${FS_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float div = texture(uDivergence, vUv).x;
  outColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}`

const CLEAR_FS = `${FS_HEAD}
uniform sampler2D uTexture;
uniform float uValue;
void main() {
  outColor = uValue * texture(uTexture, vUv);
}`

const GRADIENT_FS = `${FS_HEAD}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  outColor = vec4(vel, 0.0, 1.0);
}`

const INIT_FS = `${FS_HEAD}
${HASH}
void main() {
  outColor = vec4(hash4(vUv).xyz * 2.0 - 1.0, 0.0);
}`

const TORUS = `
vec3 torusHome(vec4 h) {
  float k = 0.095 / 0.32;
  float u = h.y * 6.2831853;
  float phi = u;
  for (int i = 0; i < 4; i++) {
    phi -= (phi + k * sin(phi) - u) / (1.0 + k * cos(phi));
  }
  float theta = h.x * 6.2831853;
  float ring = 0.32 + 0.095 * cos(phi);
  return vec3(ring * cos(theta), ring * sin(theta), 0.095 * sin(phi));
}
`

const SIM_FS = `${FS_HEAD}
uniform sampler2D uPos;
uniform sampler2D uFluid;
uniform float uTime;
uniform float uHz;
uniform float uDt;
uniform vec2 uPointer;
uniform float uPointerPower;
uniform float uAspect;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform mat3 uInvRot;
${HASH}
${TORUS}

vec3 pot(vec3 p) {
  return vec3(
    sin(p.y * 3.1 + 1.3) * cos(p.z * 2.7) + sin(p.z * 5.3 + p.x * 1.7),
    sin(p.z * 3.7 + 2.1) * cos(p.x * 2.3) + sin(p.x * 5.1 + p.y * 1.9),
    sin(p.x * 3.3 + 0.7) * cos(p.y * 2.9) + sin(p.y * 5.7 + p.z * 1.5)
  );
}

vec3 curlNoise(vec3 p) {
  float e = 0.05;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  vec3 x0 = pot(p - dx); vec3 x1 = pot(p + dx);
  vec3 y0 = pot(p - dy); vec3 y1 = pot(p + dy);
  vec3 z0 = pot(p - dz); vec3 z1 = pot(p + dz);
  return normalize(vec3(
    (y1.z - y0.z) - (z1.y - z0.y),
    (z1.x - z0.x) - (x1.z - x0.z),
    (x1.y - x0.y) - (y1.x - y0.x)
  ) + 1e-6);
}

float sdfShape(vec3 p) {
  if (length(p) > 0.8) return length(p) - 0.7;
  vec2 q = vec2(length(p.xy) - 0.32, p.z);
  return length(q) - 0.095;
}

vec3 sdfGrad(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    sdfShape(p + e.xyy) - sdfShape(p - e.xyy),
    sdfShape(p + e.yxy) - sdfShape(p - e.yxy),
    sdfShape(p + e.yyx) - sdfShape(p - e.yyx)
  ) + 1e-6);
}

void main() {
  vec4 h = hash4(vUv);
  vec3 home = torusHome(h);
  vec4 data = texture(uPos, vUv);
  vec3 pos = data.xyz;
  float birth = data.w;

  float cycle = 12.0;
  float c1 = uTime / cycle + h.w;
  float c0 = (uTime - uDt) / cycle + h.w;
  if (floor(c1) > floor(c0)) {
    vec4 hs = hash4(vUv + vec2(floor(c1) * 0.173, 0.37));
    pos = (hs.xyz * 2.0 - 1.0) * 0.75;
    birth = uTime;
  }
  if (!(length(pos) < 50.0)) {
    pos = home;
    birth = uTime;
  }

  float settle = mix(0.015, 1.0, smoothstep(0.0, 3.0, uTime - birth));
  pos += curlNoise(pos * 0.1 + uTime * 0.05) * 0.0002 * uHz;
  vec3 g = sdfGrad(pos);
  float s = sdfShape(pos);
  float thick = (h.z - 0.5) * 0.04;
  pos += cross(normalize(pos + 1e-5), g) * 0.0005 * uHz;
  pos -= g * (s - thick) * 0.06 * settle * uHz;
  pos += (home - pos) * 0.03 * settle * uHz;

  vec4 clip = uViewProj * uModel * vec4(pos, 1.0);
  vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
    vec2 vel = texture(uFluid, uv).xy;
    if (!(length(vel) < 1e4)) vel = vec2(0.0);
    float mask = smoothstep(0.4, 6.0, length(vel));
    pos += uInvRot * vec3(vel, 0.0) * 0.0001 * uHz * 0.25 * mask;

    vec2 d = uv - uPointer;
    d.x *= uAspect;
    float dist = length(d);
    float zone = smoothstep(0.15, 0.0, dist) * uPointerPower;
    if (zone > 0.0) {
      vec4 hj = hash4(vUv + vec2(uTime, 1.0));
      vec3 dir = vec3(d / (dist + 1e-4), (hj.z - 0.5) * 1.6);
      pos += uInvRot * dir * zone * 0.006 * uHz;
      pos += (hj.xyz - 0.5) * zone * 0.007;
    }
  }
  outColor = vec4(pos, birth);
}`

const POINT_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uPos;
uniform int uSize;
uniform mat4 uViewProj;
uniform mat4 uModel;
uniform float uPointScale;
uniform float uTime;
${HASH}
out vec4 vRnd;
out float vFade;
void main() {
  int i = gl_VertexID;
  ivec2 ij = ivec2(i % uSize, i / uSize);
  vec4 data = texelFetch(uPos, ij, 0);
  vec3 pos = data.xyz;
  vec4 r = hash4((vec2(ij) + 0.5) / float(uSize));
  vRnd = r;
  vFade = smoothstep(0.0, 1.5, uTime - data.w);
  pos *= mix(1.0, 1.5, pow(r.y, 150.0));
  vec4 clip = uViewProj * uModel * vec4(pos, 1.0);
  gl_Position = clip;
  gl_PointSize = max(1.0, uPointScale * mix(0.55, 1.0, r.z) * mix(0.4, 1.0, vFade) * (${CAMERA_Z.toFixed(1)} / clip.w));
}`

const POINT_FS = `#version 300 es
precision highp float;
in vec4 vRnd;
in float vFade;
uniform float uTime;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  vec3 n = vec3(c.x, -c.y, sqrt(1.0 - d));
  float light = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0);
  float rare = pow(vRnd.z, 40.0);
  vec3 base = mix(vec3(0.66), vec3(1.0), vRnd.x * 0.6);
  vec3 col = mix(base, vec3(1.0), rare);
  float twinkle = 1.0 + rare * 2.5 * (0.5 + 0.5 * sin(uTime * 3.0 + vRnd.y * 20.0));
  float alpha = (0.34 + 0.55 * rare) * (1.0 - d * 0.6) * vFade;
  outColor = vec4(col * light * twinkle, alpha);
}`

const mul4 = (a: Float32Array, b: Float32Array) => {
  const out = new Float32Array(16)
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k]
      out[c * 4 + r] = sum
    }
  }
  return out
}

const mul3 = (a: number[], b: number[]) => {
  const out = new Array<number>(9).fill(0)
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3; k++) out[c * 3 + r] += a[k * 3 + r] * b[c * 3 + k]
    }
  }
  return out
}

const rotation = (rx: number, ry: number, rz: number) => {
  const [cx, sx, cy, sy, cz, sz] = [
    Math.cos(rx),
    Math.sin(rx),
    Math.cos(ry),
    Math.sin(ry),
    Math.cos(rz),
    Math.sin(rz),
  ]
  const x = [1, 0, 0, 0, cx, sx, 0, -sx, cx]
  const y = [cy, 0, -sy, 0, 1, 0, sy, 0, cy]
  const z = [cz, sz, 0, -sz, cz, 0, 0, 0, 1]
  return mul3(z, mul3(y, x))
}

const perspective = (aspect: number) => {
  const f = 1 / Math.tan(FOV / 2)
  const near = 0.1
  const far = 100
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ])
}

const viewMatrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -CAMERA_Z, 1])

export function createParticleField(canvas: HTMLCanvasElement, options: Options): ParticleField {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('WebGL2 no disponible')
  if (!gl.getExtension('EXT_color_buffer_float'))
    throw new Error('Texturas flotantes no disponibles')

  const particleSize = options.mobile ? 128 : 256
  const simSize = options.mobile ? 96 : 128
  const count = particleSize * particleSize
  const vao = gl.createVertexArray()
  const disposables: (() => void)[] = []

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Error de shader')
    }
    return shader
  }

  const program = (vs: string, fs: string, names: string[]): Program => {
    const id = gl.createProgram()!
    const vertex = compile(gl.VERTEX_SHADER, vs)
    const fragment = compile(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(id, vertex)
    gl.attachShader(id, fragment)
    gl.linkProgram(id)
    if (!gl.getProgramParameter(id, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(id) ?? 'Error de programa')
    }
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    disposables.push(() => gl.deleteProgram(id))
    return {
      id,
      u: Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(id, name)])),
    }
  }

  const target = (size: number, internal: number, type: number, filter: number): Target => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, size, size, 0, gl.RGBA, type, null)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Framebuffer incompleto')
    }
    disposables.push(() => {
      gl.deleteTexture(tex)
      gl.deleteFramebuffer(fbo)
    })
    return { tex, fbo, w: size, h: size }
  }

  const pair = (size: number, internal: number, type: number, filter: number): Pair => {
    const state = {
      read: target(size, internal, type, filter),
      write: target(size, internal, type, filter),
    }
    return {
      get read() {
        return state.read
      },
      get write() {
        return state.write
      },
      swap() {
        const next = state.read
        state.read = state.write
        state.write = next
      },
    }
  }

  const splatP = program(QUAD_VS, SPLAT_FS, ['uTarget', 'uAspect', 'uPoint', 'uColor', 'uRadius'])
  const advectP = program(QUAD_VS, ADVECT_FS, [
    'uVelocity',
    'uSource',
    'uTexel',
    'uDt',
    'uDissipation',
  ])
  const curlP = program(QUAD_VS, CURL_FS, ['uVelocity', 'uTexel'])
  const vorticityP = program(QUAD_VS, VORTICITY_FS, [
    'uVelocity',
    'uCurl',
    'uTexel',
    'uStrength',
    'uDt',
  ])
  const divergenceP = program(QUAD_VS, DIVERGENCE_FS, ['uVelocity', 'uTexel'])
  const pressureP = program(QUAD_VS, PRESSURE_FS, ['uPressure', 'uDivergence', 'uTexel'])
  const clearP = program(QUAD_VS, CLEAR_FS, ['uTexture', 'uValue'])
  const gradientP = program(QUAD_VS, GRADIENT_FS, ['uPressure', 'uVelocity', 'uTexel'])
  const initP = program(QUAD_VS, INIT_FS, [])
  const simP = program(QUAD_VS, SIM_FS, [
    'uPos',
    'uFluid',
    'uTime',
    'uHz',
    'uViewProj',
    'uModel',
    'uInvRot',
    'uDt',
    'uPointer',
    'uPointerPower',
    'uAspect',
  ])
  const pointP = program(POINT_VS, POINT_FS, [
    'uPos',
    'uSize',
    'uViewProj',
    'uModel',
    'uPointScale',
    'uTime',
  ])
  let hue = -1
  let bgColor: number[] = []
  const syncColors = () => {
    if (hue === getHue()) return
    hue = getHue()
    bgColor = unitRgb(hue, 36, 5.5)
  }

  const velocity = pair(simSize, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR)
  const pressure = pair(simSize, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR)
  const curl = target(simSize, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR)
  const divergence = target(simSize, gl.RGBA16F, gl.HALF_FLOAT, gl.LINEAR)
  const positions = pair(particleSize, gl.RGBA32F, gl.FLOAT, gl.NEAREST)

  const texel = 1 / simSize

  const bind = (unit: number, tex: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
  }

  const draw = (t: Target | null, width: number, height: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null)
    gl.viewport(0, 0, width, height)
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const blit = (t: Target) => draw(t, t.w, t.h)

  gl.disable(gl.BLEND)
  gl.useProgram(initP.id)
  blit(positions.read)
  blit(positions.write)

  let aspect = 1
  let pointScale = 2.4
  let tx = 0
  let ty = 0
  let scale = 3
  let time = 0
  let last = performance.now()
  let raf = 0
  const gaze = { x: 0, y: 0 }
  const gazeTarget = { x: 0, y: 0 }
  let pointerPos: { x: number; y: number } | null = null
  let previous: { x: number; y: number } | null = null
  let lastSplat = 0
  let pointerUv = { x: 0.5, y: 0.5 }
  let lastMove = -1e9

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, options.mobile ? 1.5 : 2)
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    aspect = width / height
    const halfH = CAMERA_Z * Math.tan(FOV / 2)
    const halfW = halfH * aspect
    if (canvas.clientWidth >= SIDE_BY_SIDE_MIN) {
      scale = (halfH * 0.85) / SHAPE_RADIUS
      tx = halfW * 0.3
      ty = 0
    } else {
      scale = (aspect > 1 ? halfH * 0.9 : halfW * 1.3) / SHAPE_RADIUS
      tx = 0
      ty = 0
    }
    pointScale = dpr * 3.1 * Math.min(1.5, Math.max(0.6, canvas.clientHeight / 900))
  }

  const splat = (x: number, y: number, dx: number, dy: number, radius: number) => {
    gl.useProgram(splatP.id)
    bind(0, velocity.read.tex)
    gl.uniform1i(splatP.u.uTarget, 0)
    gl.uniform1f(splatP.u.uAspect, canvas.width / canvas.height)
    gl.uniform2f(splatP.u.uPoint, x, y)
    gl.uniform3f(splatP.u.uColor, dx, dy, 1)
    gl.uniform1f(splatP.u.uRadius, radius)
    blit(velocity.write)
    velocity.swap()
  }

  const applyPointer = (now: number) => {
    if (!pointerPos) return
    if (!previous) {
      previous = { ...pointerPos }
      return
    }
    const dx = pointerPos.x - previous.x
    const dy = pointerPos.y - previous.y
    const len = Math.hypot(dx, dy)
    if (len > 0.01) {
      const radius = Math.min(len / 5, 1) * 60 * 0.6 * (options.mobile ? 0.8 : 1)
      const mult = Math.min(len / 15, 1) * 10
      const startX = now - lastSplat > 50 ? pointerPos.x : previous.x
      const startY = now - lastSplat > 50 ? pointerPos.y : previous.y
      const steps = Math.max(1, Math.min(8, Math.ceil(len / 10)))
      for (let i = 1; i <= steps; i++) {
        const k = i / steps
        const px = (startX + (pointerPos.x - startX) * k) / canvas.clientWidth
        const py = 1 - (startY + (pointerPos.y - startY) * k) / canvas.clientHeight
        splat(
          px,
          py,
          Math.max(-60, Math.min(60, dx * mult)),
          Math.max(-60, Math.min(60, -dy * mult)),
          (radius / 200) ** 2 + 0.0004,
        )
      }
      lastSplat = now
    }
    previous = { ...pointerPos }
  }

  const stepFluid = (dt: number) => {
    gl.useProgram(curlP.id)
    bind(0, velocity.read.tex)
    gl.uniform1i(curlP.u.uVelocity, 0)
    gl.uniform2f(curlP.u.uTexel, texel, texel)
    blit(curl)

    gl.useProgram(vorticityP.id)
    bind(0, velocity.read.tex)
    bind(1, curl.tex)
    gl.uniform1i(vorticityP.u.uVelocity, 0)
    gl.uniform1i(vorticityP.u.uCurl, 1)
    gl.uniform2f(vorticityP.u.uTexel, texel, texel)
    gl.uniform1f(vorticityP.u.uStrength, 30)
    gl.uniform1f(vorticityP.u.uDt, dt)
    blit(velocity.write)
    velocity.swap()

    gl.useProgram(divergenceP.id)
    bind(0, velocity.read.tex)
    gl.uniform1i(divergenceP.u.uVelocity, 0)
    gl.uniform2f(divergenceP.u.uTexel, texel, texel)
    blit(divergence)

    gl.useProgram(clearP.id)
    bind(0, pressure.read.tex)
    gl.uniform1i(clearP.u.uTexture, 0)
    gl.uniform1f(clearP.u.uValue, 0.95)
    blit(pressure.write)
    pressure.swap()

    gl.useProgram(pressureP.id)
    bind(0, divergence.tex)
    gl.uniform1i(pressureP.u.uDivergence, 0)
    gl.uniform1i(pressureP.u.uPressure, 1)
    gl.uniform2f(pressureP.u.uTexel, texel, texel)
    for (let i = 0; i < 5; i++) {
      bind(1, pressure.read.tex)
      blit(pressure.write)
      pressure.swap()
    }

    gl.useProgram(gradientP.id)
    bind(0, pressure.read.tex)
    bind(1, velocity.read.tex)
    gl.uniform1i(gradientP.u.uPressure, 0)
    gl.uniform1i(gradientP.u.uVelocity, 1)
    gl.uniform2f(gradientP.u.uTexel, texel, texel)
    blit(velocity.write)
    velocity.swap()

    gl.useProgram(advectP.id)
    bind(0, velocity.read.tex)
    bind(1, velocity.read.tex)
    gl.uniform1i(advectP.u.uVelocity, 0)
    gl.uniform1i(advectP.u.uSource, 1)
    gl.uniform2f(advectP.u.uTexel, texel, texel)
    gl.uniform1f(advectP.u.uDt, dt)
    gl.uniform1f(advectP.u.uDissipation, 0.98)
    blit(velocity.write)
    velocity.swap()
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (document.hidden) {
      last = now
      return
    }
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    time += dt

    applyPointer(now)
    stepFluid(Math.max(dt, 1 / 120))

    const ease = 1 - Math.exp(-dt * 3.5)
    gaze.x += (gazeTarget.x - gaze.x) * ease
    gaze.y += (gazeTarget.y - gaze.y) * ease

    const rot = rotation(
      -0.5 + 0.25 * Math.sin(time * 0.13) + 0.12 * Math.sin(time * 0.31 + 1.3) + gaze.y * 0.15,
      0.6 * Math.sin(time * 0.09) + 0.25 * Math.sin(time * 0.23 + 0.5) + gaze.x * 0.2,
      0.35 * Math.sin(time * 0.11 + 2),
    )
    const model = new Float32Array([
      rot[0] * scale,
      rot[1] * scale,
      rot[2] * scale,
      0,
      rot[3] * scale,
      rot[4] * scale,
      rot[5] * scale,
      0,
      rot[6] * scale,
      rot[7] * scale,
      rot[8] * scale,
      0,
      tx,
      ty,
      0,
      1,
    ])
    const invRot = new Float32Array([
      rot[0],
      rot[3],
      rot[6],
      rot[1],
      rot[4],
      rot[7],
      rot[2],
      rot[5],
      rot[8],
    ])
    const viewProj = mul4(perspective(aspect), viewMatrix)

    gl.disable(gl.BLEND)
    gl.useProgram(simP.id)
    bind(0, positions.read.tex)
    bind(1, velocity.read.tex)
    gl.uniform1i(simP.u.uPos, 0)
    gl.uniform1i(simP.u.uFluid, 1)
    gl.uniform1f(simP.u.uTime, time)
    gl.uniform1f(simP.u.uHz, dt * 60)
    gl.uniform1f(simP.u.uDt, dt)
    gl.uniform2f(simP.u.uPointer, pointerUv.x, pointerUv.y)
    gl.uniform1f(simP.u.uPointerPower, Math.max(0, 1 - (now - lastMove) / 1400))
    gl.uniform1f(simP.u.uAspect, aspect)
    gl.uniformMatrix4fv(simP.u.uViewProj, false, viewProj)
    gl.uniformMatrix4fv(simP.u.uModel, false, model)
    gl.uniformMatrix3fv(simP.u.uInvRot, false, invRot)
    blit(positions.write)
    positions.swap()

    syncColors()
    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.useProgram(pointP.id)
    bind(0, positions.read.tex)
    gl.uniform1i(pointP.u.uPos, 0)
    gl.uniform1i(pointP.u.uSize, particleSize)
    gl.uniform1f(pointP.u.uPointScale, pointScale)
    gl.uniform1f(pointP.u.uTime, time)
    gl.uniformMatrix4fv(pointP.u.uViewProj, false, viewProj)
    gl.uniformMatrix4fv(pointP.u.uModel, false, model)
    gl.bindVertexArray(vao)
    gl.drawArrays(gl.POINTS, 0, count)
  }

  resize()
  raf = requestAnimationFrame(frame)

  return {
    resize,
    pointer(x, y) {
      pointerPos = { x, y }
      pointerUv = { x: x / canvas.clientWidth, y: 1 - y / canvas.clientHeight }
      lastMove = performance.now()
      gazeTarget.x = (x / canvas.clientWidth) * 2 - 1
      gazeTarget.y = (y / canvas.clientHeight) * 2 - 1
    },
    tilt(x, y) {
      gazeTarget.x = x
      gazeTarget.y = y
    },
    destroy() {
      cancelAnimationFrame(raf)
      disposables.forEach((dispose) => dispose())
      gl.deleteVertexArray(vao)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
