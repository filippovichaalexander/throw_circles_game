import type { Circle } from './types';

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_instancePos;
in float a_instanceRadius;
in vec4 a_instanceColor;
in float a_instanceSelected;

uniform vec2 u_resolution;

out vec4 v_color;
out vec2 v_local;
out float v_selected;
out float v_radius;

void main() {
  vec2 worldPos = a_instancePos + a_position * a_instanceRadius;
  vec2 clip = (worldPos / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_color = a_instanceColor;
  v_local = a_position;
  v_selected = a_instanceSelected;
  v_radius = a_instanceRadius;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_local;
in float v_selected;
in float v_radius;

out vec4 outColor;

void main() {
  float dist = length(v_local);
  if (dist > 1.0) discard;

  vec4 color = v_color;
  float radius = max(v_radius, 1.0);
  float aaPx = 1.25;
  float aaNorm = aaPx / radius;
  float edge = 1.0 - smoothstep(1.0 - aaNorm, 1.0, dist);
  color.a *= edge;

  bool transparent = v_color.a < 0.999;
  vec3 grayBorder = vec3(0.55, 0.55, 0.58);
  float borderPx = 3.0;
  float borderNorm = borderPx / radius;
  float outerBorder = 1.0 - smoothstep(1.0 - aaNorm, 1.0, dist);
  float innerBorder = 1.0 - smoothstep(1.0 - borderNorm - aaNorm, 1.0 - borderNorm, dist);
  float borderMask = clamp(outerBorder - innerBorder, 0.0, 1.0);

  if (v_selected > 0.5) {
    float selectedBorderPx = 4.0;
    float selectedBorderNorm = selectedBorderPx / radius;
    float innerSelected = 1.0 - smoothstep(
      1.0 - selectedBorderNorm - aaNorm,
      1.0 - selectedBorderNorm,
      dist
    );
    float ring = clamp(outerBorder - innerSelected, 0.0, 1.0);
    vec3 ringColor = mix(grayBorder, vec3(1.0), 0.75);
    color.rgb = mix(color.rgb, ringColor, ring * 0.9);
    color.a = max(color.a, ring * (transparent ? 0.8 : 0.95));
  }

  outColor = color;
}
`;

const QUAD = new Float32Array([
  -1, -1,
  1, -1,
  -1, 1,
  -1, 1,
  1, -1,
  1, 1,
]);

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instanceBuffer: WebGLBuffer;
  private resolutionLoc: WebGLUniformLocation;
  private logicalWidth = 1;
  private logicalHeight = 1;
  private pixelWidth = 1;
  private pixelHeight = 1;
  private instanceData = new Float32Array(0);

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error('WebGL2 не поддерживается в этом браузере');
    }
    this.gl = gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program || !vs || !fs) throw new Error('Не удалось создать шейдерную программу');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Ошибка линковки шейдеров');
    }
    this.program = program;
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    if (!resolutionLoc) throw new Error('u_resolution не найден');
    this.resolutionLoc = resolutionLoc;

    const vao = gl.createVertexArray();
    const quadBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    if (!vao || !quadBuffer || !instanceBuffer) {
      throw new Error('Не удалось создать WebGL буферы');
    }
    this.vao = vao;
    this.instanceBuffer = instanceBuffer;

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    // stride: xy, radius, rgba, selected
    const stride = 8 * 4;
    const iPos = gl.getAttribLocation(program, 'a_instancePos');
    const iRad = gl.getAttribLocation(program, 'a_instanceRadius');
    const iCol = gl.getAttribLocation(program, 'a_instanceColor');
    const iSel = gl.getAttribLocation(program, 'a_instanceSelected');

    gl.enableVertexAttribArray(iPos);
    gl.vertexAttribPointer(iPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(iPos, 1);

    gl.enableVertexAttribArray(iRad);
    gl.vertexAttribPointer(iRad, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(iRad, 1);

    gl.enableVertexAttribArray(iCol);
    gl.vertexAttribPointer(iCol, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(iCol, 1);

    gl.enableVertexAttribArray(iSel);
    gl.vertexAttribPointer(iSel, 1, gl.FLOAT, false, stride, 28);
    gl.vertexAttribDivisor(iSel, 1);

    gl.bindVertexArray(null);

    gl.enable(gl.BLEND);
    // прозрачные круги корректно с фоном арены
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(width: number, height: number, dpr: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.pixelWidth = Math.max(1, Math.floor(width * dpr));
    this.pixelHeight = Math.max(1, Math.floor(height * dpr));
    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.width = this.pixelWidth;
    canvas.height = this.pixelHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, this.pixelWidth, this.pixelHeight);
  }

  clear(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw(circles: Circle[], selectedId: number | null): void {
    const gl = this.gl;
    const count = circles.length;
    if (count === 0) {
      this.clear();
      return;
    }

    if (this.instanceData.length < count * 8) {
      this.instanceData = new Float32Array(Math.max(count, 16) * 8);
    }

    for (let i = 0; i < count; i++) {
      const c = circles[i];
      const o = i * 8;
      this.instanceData[o] = c.x;
      this.instanceData[o + 1] = c.y;
      this.instanceData[o + 2] = c.radius;
      this.instanceData[o + 3] = c.r;
      this.instanceData[o + 4] = c.g;
      this.instanceData[o + 5] = c.b;
      this.instanceData[o + 6] = c.a;
      this.instanceData[o + 7] = c.id === selectedId ? 1 : 0;
    }

    gl.useProgram(this.program);
    gl.uniform2f(this.resolutionLoc, this.logicalWidth, this.logicalHeight);

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.subarray(0, count * 8), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    gl.bindVertexArray(null);
  }

  getLogicalSize(): { width: number; height: number } {
    return { width: this.logicalWidth, height: this.logicalHeight };
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
}
