import './style.css'

const canvas = document.querySelector<HTMLCanvasElement>('#bubbleCanvas');
if (!canvas) throw new Error("Canvas not found");
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error("Context not found");

// Утилиты для размеров
const setCanvasSize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
setCanvasSize();

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Позиция для параллакса
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

const RAINBOW_COLORS = [
  { main: 'rgba(255, 0, 80, 0.3)', light: 'rgba(255, 200, 220, 0.5)' },
  { main: 'rgba(255, 120, 0, 0.3)', light: 'rgba(255, 220, 150, 0.5)' },
  { main: 'rgba(255, 230, 0, 0.3)', light: 'rgba(255, 255, 200, 0.5)' },
  { main: 'rgba(0, 255, 120, 0.3)', light: 'rgba(200, 255, 220, 0.5)' },
  { main: 'rgba(0, 180, 255, 0.3)', light: 'rgba(200, 240, 255, 0.5)' },
  { main: 'rgba(150, 50, 255, 0.3)', light: 'rgba(230, 200, 255, 0.5)' },
  { main: 'rgba(255, 0, 200, 0.3)', light: 'rgba(255, 200, 255, 0.5)' }
];

const MOUSE_TRAIL_COLORS = [
  'rgba(255, 192, 203, 0.7)', 'rgba(255, 105, 180, 0.7)', 
  'rgba(255, 0, 150, 0.7)', 'rgba(255, 150, 200, 0.7)'
];

let audioCtx: AudioContext | null = null;

function playPopSound() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100 + Math.random() * 200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

class Star {
  x: number; y: number; radius: number; alpha: number; flicker: number; depth: number;
  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.radius = Math.random() * 1.2 + 0.2;
    this.alpha = Math.random();
    this.flicker = Math.random() * 0.01 + 0.005;
    this.depth = Math.random() * 0.05;
  }
  draw() {
    if (!ctx) return;
    this.alpha += this.flicker * (Math.random() > 0.5 ? 1 : -1);
    if (this.alpha > 1) this.alpha = 1;
    if (this.alpha < 0.1) this.alpha = 0.1;
    const offsetX = (mouseX - window.innerWidth / 2) * this.depth;
    const offsetY = (mouseY - window.innerHeight / 2) * this.depth;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x + offsetX, this.y + offsetY, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  x: number; y: number; vx: number; vy: number; life = 1.0; color: string; size: number;
  constructor(x: number, y: number, color: string) {
    this.x = x; this.y = y; this.color = color;
    this.size = Math.random() * 1.5 + 0.5;
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * force;
    this.vy = Math.sin(angle) * force;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.93; this.vy *= 0.93;
    this.vy += 0.12;
    this.life -= 0.04;
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life * 0.6);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class PopRing {
  x: number; y: number; radius: number; maxRadius: number; life = 1.0; color: string;
  constructor(x: number, y: number, radius: number, color: string) {
    this.x = x; this.y = y; this.radius = radius;
    this.maxRadius = radius * 1.3;
    this.color = color;
  }
  update() {
    this.radius += (this.maxRadius - this.radius) * 0.15;
    this.life -= 0.06;
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life * 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

class MouseTrailParticle {
  x: number; y: number; vx: number; vy: number; life = 1.0; color: string; size: number;
  constructor(x: number, y: number, colorIndex: number) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = (Math.random() - 0.5) * 1;
    this.size = Math.random() * 5 + 2;
    this.color = MOUSE_TRAIL_COLORS[colorIndex];
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.life -= 0.025;
    this.size *= 0.98;
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life * 0.5);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Bubble {
  x: number; y: number; radius: number; colorIndex: number;
  isPopped = false; vx: number; vy: number;

  constructor() {
    this.x = 0; this.y = 0; this.radius = 0; this.vx = 0; this.vy = 0; this.colorIndex = 0;
    this.reset();
  }

  reset() {
    const sizeBase = isMobile ? 35 : 55;
    const sizeExtra = isMobile ? 25 : 40;
    this.radius = Math.random() * sizeExtra + sizeBase;
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.colorIndex = Math.floor(Math.random() * RAINBOW_COLORS.length);
    this.isPopped = false;
  }

  repel(ex: number, ey: number) {
    if (this.isPopped) return;
    const dist = Math.hypot(this.x - ex, this.y - ey);
    const forceRange = 300;
    if (dist < forceRange) {
      const angle = Math.atan2(this.y - ey, this.x - ex);
      const power = (forceRange - dist) / forceRange;
      this.vx += Math.cos(angle) * power * 15;
      this.vy += Math.sin(angle) * power * 15;
    }
  }

  draw() {
    if (this.isPopped || !ctx) return;
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;

    if (this.x < -this.radius) this.x = window.innerWidth + this.radius;
    if (this.x > window.innerWidth + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = window.innerHeight + this.radius;
    if (this.y > window.innerHeight + this.radius) this.y = -this.radius;

    const col = RAINBOW_COLORS[this.colorIndex];
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = col.main;
    ctx.beginPath();
    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.05,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(0.6, col.light);
    grad.addColorStop(1, col.main);
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.arc(this.x - this.radius * 0.45, this.y - this.radius * 0.45, this.radius * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  checkHit(mx: number, my: number) {
    if (!this.isPopped && Math.hypot(mx - this.x, my - this.y) < this.radius) {
      this.pop();
    }
  }

  pop() {
    if (this.isPopped) return; // Защита от повторного срабатывания
    this.isPopped = true;
    
    const popX = this.x;
    const popY = this.y;
    
    playPopSound();
    const color = RAINBOW_COLORS[this.colorIndex].main;
    rings.push(new PopRing(popX, popY, this.radius, color));
    for (let i = 0; i < 20; i++) particles.push(new Particle(popX, popY, color));
    
    // Мгновенно убираем невидимый объект далеко за экран
    this.x = -2000;
    this.y = -2000;

    setTimeout(() => this.reset(), 4000 + Math.random() * 2000);
  }
}

// Состояние
let particles: Particle[] = [];
let rings: PopRing[] = [];
let mouseTrailParticles: MouseTrailParticle[] = [];
const stars = Array.from({ length: 250 }, () => new Star());
const bubbles = Array.from({ length: isMobile ? 20 : 55 }, () => new Bubble());
let trailCounter = 0;

function animate() {
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  
  stars.forEach(s => s.draw());
  
  mouseTrailParticles = mouseTrailParticles.filter(p => p.life > 0);
  mouseTrailParticles.forEach(p => { p.update(); p.draw(); });

  rings = rings.filter(r => r.life > 0);
  rings.forEach(r => { r.update(); r.draw(); });

  bubbles.forEach(b => b.draw());

  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => { p.update(); p.draw(); });

  requestAnimationFrame(animate);
}

// События
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (!isMobile) {
    trailCounter++;
    if (trailCounter % 2 === 0) {
      mouseTrailParticles.push(new MouseTrailParticle(e.clientX, e.clientY, Math.floor(Math.random() * MOUSE_TRAIL_COLORS.length)));
    }
  }
  bubbles.forEach(b => b.checkHit(e.clientX, e.clientY));
});

window.addEventListener('mousedown', (e) => {
  rings.push(new PopRing(e.clientX, e.clientY, 10, 'rgba(255, 255, 255, 0.5)'));
  bubbles.forEach(b => b.repel(e.clientX, e.clientY));
});

window.addEventListener('touchmove', (e) => {
  const t = e.touches[0];
  mouseX = t.clientX; mouseY = t.clientY;
  bubbles.forEach(b => b.checkHit(t.clientX, t.clientY));
}, { passive: false });

window.addEventListener('touchstart', (e) => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = e.touches[0];
  bubbles.forEach(b => b.repel(t.clientX, t.clientY));
}, { once: false });

window.addEventListener('resize', setCanvasSize);

animate();