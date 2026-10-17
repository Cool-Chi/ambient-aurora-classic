(function (AA) {
const { on, clamp } = AA.util;
class WebGLEngine {
  constructor(canvas, store) {
    this.canvas = canvas;
    this.store = store;
    this.glReady = false;
    this.uniforms = {};
    this.running = false;
    this.rafId = null;
    const state = this.store.getState();
    this.colorLive = [...state.colorTarget];
    this.currentWeights = [0, 0, 0, 0, 0];
    this.targetWeights = [0, 0, 0, 0, 0];
    this.currentWeights[state.mode - 1] = 1.0;
    this.targetWeights[state.mode - 1] = 1.0;
    this.currentBrightness = 1.0;
    this.globalTime = 0;
    this.lastTime = performance.now();
    this.renderBound = this.render.bind(this);
    this.frameClock = performance.now();
    this.timeWrapState = 0;
    this.wrapFade = 1;
    this.fallbackEl = canvas.parentElement;
    this.fallbackActive = false;
    this.vsSource = `attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;
    this.fsSource = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;uniform float u_time;uniform vec3 u_color;uniform float u_weights[5];uniform float u_brightness;float hash(float n){
return fract(sin(n)*43758.5453);}float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);
vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i+vec2(0.0,0.0)),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}float fbm(vec2 p){
float f=0.0;float amp=0.5;for(int i=0;i<4;i++){f +=amp*noise(p);p*=2.0;amp*=0.5;}return f;}vec3 renderSilk(vec2 uv){vec2 p=uv*2.0-1.0;p.x*=u_resolution.x/u_resolution.y;
float t=u_time*0.25;vec2 q=p;q.x +=sin(p.y*1.5+t*0.8)*0.6;q.y +=cos(p.x*1.5+t*0.6)*0.6;vec2 r=p;r.x +=cos(q.y*2.0+sin(q.x*1.8+t))*0.5;
r.y +=sin(q.x*2.0+cos(q.y*1.8+t*0.9))*0.5;float folds=(sin(r.x*2.5+r.y*2.0+t)+cos(r.x*1.8-r.y*2.2-t*0.7))*0.5;float sheen=pow(clamp(folds*0.5+0.5,0.0,1.0),3.0);
vec3 col=mix(u_color*0.15,u_color*1.1,smoothstep(-1.0,0.5,folds));col +=mix(u_color*1.8,vec3(1.0),0.35)*sheen*0.65;return col*(1.0-length(p*0.3)*0.4);}
vec3 renderIntelligence(vec2 uv){vec2 dc=abs(uv-0.5)*2.0;float edge=max(pow(dc.x,8.0),pow(dc.y,8.0));
return u_color*smoothstep(0.4,1.2,edge+fbm(uv*2.0-u_time*0.2)*0.4)*smoothstep(0.0,0.4,length(dc))*3.0;}vec3 renderStardust(vec2 uv){vec2 p=(uv-0.5)*2.0;
p.x*=u_resolution.x/u_resolution.y;float nebula=pow((fbm(p*1.5-u_time*0.05)*0.6+fbm(p*3.0+u_time*0.08)*0.4),2.5)*1.5;vec2 grid=p*20.0;vec2 id=floor(grid);
vec2 fv=fract(grid)-0.5;float dist=length(fv-(vec2(hash(id+vec2(1.3,7.1)),hash(id+vec2(7.1,1.3)))-0.5));
float star=smoothstep(0.12,0.0,dist)*(sin(u_time*2.0+hash(dot(id,vec2(1.0,25.0)))*25.0)*0.5+0.5)*step(0.7,hash(dot(id,vec2(3.7,1.7))));
return(u_color*nebula+vec3(star*0.8))*(1.0-length(p)*0.4);}vec3 renderLiquid(vec2 uv){vec2 p=uv*2.0-1.0;p.x*=u_resolution.x/u_resolution.y;float t=u_time*0.2;
vec2 c1=vec2(sin(t)*0.8,cos(t*0.6)*0.6);vec2 c2=vec2(cos(t*1.2)*0.7,sin(t*0.9)*0.7);vec2 c3=vec2(sin(t*0.7+2.0)*0.6,cos(t*1.1+1.0)*0.6);
float w1=smoothstep(2.0,0.0,length(p-c1));float w2=smoothstep(2.0,0.0,length(p-c2));float w3=smoothstep(2.0,0.0,length(p-c3));vec3 col1=u_color*1.2;
vec3 col2=mix(u_color,vec3(1.0),0.3);vec3 col3=u_color*0.7;vec3 bg=u_color*0.15;return bg+col1*w1+col2*w2+col3*w3;}vec3 renderHorizon(vec2 uv){vec2 p=uv*2.0-1.0;
p.x*=u_resolution.x/u_resolution.y;float curve=-0.7+sin(p.x*0.6+u_time*0.1)*0.15+cos(p.x*0.3-u_time*0.05)*0.1;float dist=p.y-curve;float primaryGlow=exp(-dist*2.5);
float coreGlow=exp(-dist*8.0);float n=fbm(p*2.0+vec2(u_time*0.05,0.0));float atmosphere=primaryGlow*(0.7+n*0.5);float mask=smoothstep(-0.05,0.1,dist);vec2 grid=p*12.0;
vec2 id=floor(grid);vec2 fv=fract(grid)-0.5;float starDist=length(fv-(vec2(hash(id+2.0),hash(id+5.1))-0.5));
float star=smoothstep(0.08,0.0,starDist)*step(0.92,hash(id*7.3));float twinkle=sin(u_time*1.5+hash(id)*20.0)*0.5+0.5;float skyMask=smoothstep(0.0,1.0,p.y);
vec3 glowColor=u_color*atmosphere*mask+(u_color*1.5+0.2)*coreGlow*mask;vec3 starColor=vec3(star*twinkle*0.5*skyMask);return glowColor+starColor;}void main(){
vec2 uv=gl_FragCoord.xy/u_resolution.xy;vec3 c=vec3(0.0);if(u_weights[0]>0.001)c +=renderSilk(uv)*u_weights[0];
if(u_weights[1]>0.001)c +=renderIntelligence(uv)*u_weights[1];if(u_weights[2]>0.001)c +=renderStardust(uv)*u_weights[2];
if(u_weights[3]>0.001)c +=renderLiquid(uv)*u_weights[3];if(u_weights[4]>0.001)c +=renderHorizon(uv)*u_weights[4];
gl_FragColor=vec4((c+vec3((fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)*0.008))*u_brightness,1.0);}`;
    on(this.canvas, 'webglcontextlost', (e) => { e.preventDefault(); this.glReady = false; this.pause(); this.showFallback(); }, false);
    on(this.canvas, 'webglcontextrestored', () => { this.initGL(); if (!document.hidden) this.resume(); }, false);
    this.initGL();
    this.store.subscribe((key, val) => this.handleStateChange(key, val));
    on(window, 'resize', () => this.resize());
  }
  compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  initGL() {
    this.gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' }) ||
              this.canvas.getContext('experimental-webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
    this.glReady = false;
    if (!this.gl) { this.showFallback(); return; }
    const vs = this.compileShader(this.gl, this.vsSource, this.gl.VERTEX_SHADER);
    const fs = this.compileShader(this.gl, this.fsSource, this.gl.FRAGMENT_SHADER);
    if (vs && fs) {
      const program = this.gl.createProgram();
      this.gl.attachShader(program, vs);
      this.gl.attachShader(program, fs);
      this.gl.linkProgram(program);
      if (this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        this.gl.useProgram(program);
        const pb = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, pb);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), this.gl.STATIC_DRAW);
        const pos = this.gl.getAttribLocation(program, 'position');
        this.gl.enableVertexAttribArray(pos);
        this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
        ['u_resolution', 'u_time', 'u_color', 'u_weights', 'u_brightness'].forEach(n => this.uniforms[n] = this.gl.getUniformLocation(program, n));
        this.glReady = true;
        this.hideFallback();
        this.resize();
      } else {
        console.error(this.gl.getProgramInfoLog(program));
      }
    }
    if (!this.glReady) this.showFallback();
  }
  updateFallback() {
    if (!this.fallbackActive || !this.fallbackEl) return;
    const state = this.store.getState();
    const c = state.nightMode ? [0.16, 0.08, 0.0] : state.colorTarget;
    const rgb = (m) => `rgb(${c.map(x => Math.round(clamp(x * m, 0, 1) * 255)).join(',')})`;
    this.fallbackEl.style.background = `radial-gradient(ellipse at 30% 25%, ${rgb(1.6)} 0%, ${rgb(0.8)} 45%, #050505 100%)`;
  }
  showFallback() {
    if (!this.fallbackEl) return;
    this.fallbackActive = true;
    this.canvas.style.display = 'none';
    this.updateFallback();
  }
  hideFallback() {
    if (!this.fallbackActive) return;
    this.fallbackActive = false;
    this.canvas.style.display = '';
    if (this.fallbackEl) this.fallbackEl.style.background = '';
  }
  handleStateChange(key, val) {
    if (key === 'mode') {
      this.targetWeights.fill(0);
      this.targetWeights[val - 1] = 1.0;
    } else if (key === 'lowPower') {
      this.resize();
    } else if (key === 'colorTarget' || key === 'nightMode') {
      this.updateFallback();
    }
  }
  resize() {
    if (!this.glReady || !this.gl || this.gl.isContextLost()) return;
    const { lowPower } = this.store.getState();
    const PIXEL_BUDGET = 2500000;
    const cssW = Math.max(1, window.innerWidth);
    const cssH = Math.max(1, window.innerHeight);
    const dpr = lowPower ? 0.75 : Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(dpr, Math.sqrt(PIXEL_BUDGET / (cssW * cssH)));
    const w = Math.max(1, Math.round(cssW * scale));
    const h = Math.max(1, Math.round(cssH * scale));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const bw = this.gl.drawingBufferWidth || w;
    const bh = this.gl.drawingBufferHeight || h;
    this.gl.viewport(0, 0, bw, bh);
    this.gl.uniform2f(this.uniforms.u_resolution, bw, bh);
    this.draw();
  }
  draw() {
    if (!this.glReady || !this.gl || this.gl.isContextLost()) return;
    this.gl.uniform1f(this.uniforms.u_time, this.globalTime);
    this.gl.uniform3f(this.uniforms.u_color, this.colorLive[0], this.colorLive[1], this.colorLive[2]);
    this.gl.uniform1fv(this.uniforms.u_weights, this.currentWeights);
    const wf = this.wrapFade;
    this.gl.uniform1f(this.uniforms.u_brightness, this.currentBrightness * (wf * wf * (3 - 2 * wf)));
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
  pause() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  resume() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameClock = this.lastTime;
    this.rafId = requestAnimationFrame(this.renderBound);
  }
  render(timestamp) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.renderBound);
    const { isIdle, lowPower, speed, nightMode, colorTarget, isHolding } = this.store.getState();
    const minInterval = isIdle ? 50 : lowPower ? 41.6 : 16.6;
    if (timestamp < this.frameClock + minInterval - 2) return;
    this.frameClock += minInterval;
    if (timestamp - this.frameClock > minInterval) this.frameClock = timestamp;
    const dt = clamp(timestamp - this.lastTime, 0, 100), k = 1 - Math.pow(1 - 0.033, dt / 16.666);
    this.lastTime = timestamp;
    if (!this.glReady) return;
    this.globalTime += 0.01 * speed * (dt / 16.666);
    if (this.timeWrapState === 0 && this.globalTime > 10000.0) this.timeWrapState = 1;
    if (this.timeWrapState === 1) {
      this.wrapFade -= dt / 800;
      if (this.wrapFade <= 0) { this.wrapFade = 0; this.globalTime = 0; this.timeWrapState = 2; }
    } else if (this.timeWrapState === 2) {
      this.wrapFade += dt / 800;
      if (this.wrapFade >= 1) { this.wrapFade = 1; this.timeWrapState = 0; }
    }
    const target = nightMode ? [0.16, 0.08, 0.0] : colorTarget;
    for (let i = 0; i < 3; i++) this.colorLive[i] += (target[i] - this.colorLive[i]) * k;
    for (let i = 0; i < 5; i++) this.currentWeights[i] += (this.targetWeights[i] - this.currentWeights[i]) * k;
    this.currentBrightness += ((isHolding ? 1.5 : isIdle ? 0.65 : 1.0) - this.currentBrightness) * k;
    this.draw();
  }
  start() {
    this.resize();
    this.resume();
  }
}
AA.WebGLEngine = WebGLEngine;
})(window.AA);
