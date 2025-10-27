import { CanvasTexture, NearestFilter, RepeatWrapping } from 'three';

type TextureConfig = {
  width: number;
  height: number;
  pattern: (ctx: CanvasRenderingContext2D) => void;
  repeat?: [number, number];
};

function createTexture({ width, height, pattern, repeat = [1, 1] }: TextureConfig) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  pattern(ctx);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  return texture;
}

export function createTrackTexture() {
  return createTexture({
    width: 64,
    height: 64,
    repeat: [8, 8],
    pattern: (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, '#4d4f58');
      gradient.addColorStop(1, '#2a2d33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 24]);
      for (let y = 0; y < 64; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y + 8);
        ctx.lineTo(64, y + 8);
        ctx.stroke();
      }
    },
  });
}

export function createGrassTexture() {
  return createTexture({
    width: 32,
    height: 32,
    repeat: [12, 12],
    pattern: (ctx) => {
      ctx.fillStyle = '#285c2a';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#316f32';
      for (let i = 0; i < 32; i += 4) {
        ctx.fillRect(i % 32, (i * 3) % 32, 2, 4);
      }
    },
  });
}

export function createCrowdTexture() {
  return createTexture({
    width: 32,
    height: 32,
    repeat: [6, 2],
    pattern: (ctx) => {
      ctx.fillStyle = '#1f1b2e';
      ctx.fillRect(0, 0, 32, 32);
      const colors = ['#ff5d73', '#4cc9f0', '#ffe066', '#fb5607'];
      for (let y = 2; y < 32; y += 4) {
        for (let x = 0; x < 32; x += 2) {
          ctx.fillStyle = colors[(x + y) % colors.length];
          ctx.fillRect(x, y, 2, 2);
        }
      }
    },
  });
}

export function createCarTexture(color = '#ff1744') {
  return createTexture({
    width: 16,
    height: 16,
    pattern: (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#212121';
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 14, 16, 2);
    },
  });
}
