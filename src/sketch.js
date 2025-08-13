import canvasSketch from 'canvas-sketch';
import random from 'canvas-sketch-util/random';
import math from 'canvas-sketch-util/math';
import eases from 'eases';
import colormap from 'colormap';

// Configurações da tela
const settings = {
  dimensions: [1080, 1080],
  animate: true,
};

const particles = [];
const cursor = { x: 9999, y: 9999 };

// Colormap
const colors = colormap({
  colormap: 'viridis',
  nshades: 20,
});

let elCanvas;
let imgA;

const sketch = ({ width, height, canvas }) => {
  // canvas.id = "main-canvas";
  const imgACanvas = document.createElement('canvas');
  const imgAContext = imgACanvas.getContext('2d');

  imgACanvas.width = imgA.width;
  imgACanvas.height = imgA.height;
  imgAContext.drawImage(imgA, 0, 0);
  const imgAData = imgAContext.getImageData(0, 0, imgA.width, imgA.height).data;

  const numCircles = 30;
  const gapCircle = 1;
  const gapDot = 1;
  let dotRadius = 11;
  let cirRadius = 0.1;
  const fitRadius = dotRadius;

  elCanvas = canvas;
  canvas.addEventListener('mousedown', onMouseDown);

  for (let i = 0; i < numCircles; i++) {
    const circumference = Math.PI * 2 * cirRadius;
    const numFit = i ? Math.floor(circumference / (fitRadius * 2 + gapDot)) : 1;
    const fitSlice = Math.PI * 2 / numFit;

    for (let j = 0; j < numFit; j++) {
      const theta = fitSlice * j;
      let x = Math.cos(theta) * cirRadius;
      let y = Math.sin(theta) * cirRadius;

      x += width * 0.5;
      y += height * 0.5;

      const ix = Math.floor((x / width) * imgA.width);
      const iy = Math.floor((y / height) * imgA.height);
      const idx = (iy * imgA.width + ix) * 4;

      const r = imgAData[idx + 0];
      const g = imgAData[idx + 1];
      const b = imgAData[idx + 2];
      const colA = `rgb(${r}, ${g}, ${b})`;

      const radius = math.mapRange(r, 0, 255, 1, 12);

      const particle = new Particle({ x, y, radius, colA });
      particles.push(particle);
    }

    cirRadius += fitRadius * 2 + gapCircle;
    dotRadius = (1 - eases.quadOut(i / numCircles)) * fitRadius;
  }

  return ({ context, width, height }) => {
    context.save();
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    context.translate(width / 2, height / 2);
    context.scale(0.68, 0.68);
    context.translate(-width / 2, -height / 2);

    context.drawImage(imgACanvas, 0, 0);
    particles.sort((a, b) => a.scale - b.scale);

    particles.forEach(p => {
      p.update();
      p.draw(context);
    });

    context.restore();
  };
};

const onMouseDown = e => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  onMouseMove(e);
};

const onMouseMove = e => {
  const x = (e.offsetX / elCanvas.offsetWidth) * elCanvas.width;
  const y = (e.offsetY / elCanvas.offsetHeight) * elCanvas.height;
  cursor.x = x;
  cursor.y = y;
};

const onMouseUp = () => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  cursor.x = 9999;
  cursor.y = 9999;
};

const loadImage = url => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const start = async () => {
  // URL da imagem no Vite — precisa dessa sintaxe para funcionar no build
  imgA = await loadImage(new URL('./images/image-01.png', import.meta.url).href);
  canvasSketch(sketch, settings);
};

start();

class Particle {
  constructor({ x, y, radius = 10, colA }) {
    this.x = x;
    this.y = y;
    this.ax = 0;
    this.ay = 0;
    this.vx = 0;
    this.vy = 0;
    this.ix = x;
    this.iy = y;
    this.radius = radius;
    this.scale = 1;
    this.color = colA;
    this.minDist = random.range(100, 200);
    this.pushFactor = random.range(0.02, 0.02);
    this.pullFactor = random.range(0.002, 0.006);
    this.dampFactor = random.range(0.90, 0.95);
  }

  update() {
    let dx = this.ix - this.x;
    let dy = this.iy - this.y;
    let dd = Math.sqrt(dx * dx + dy * dy);
    this.ax = dx * this.pullFactor;
    this.ay = dy * this.pullFactor;
    this.scale = math.mapRange(dd, 0, 200, 1, 5);

    dx = this.x - cursor.x;
    dy = this.y - cursor.y;
    dd = Math.sqrt(dx * dx + dy * dy);
    const distDelta = this.minDist - dd;

    if (dd < this.minDist) {
      this.ax += (dx / dd) * distDelta * this.pushFactor;
      this.ay += (dy / dd) * distDelta * this.pushFactor;
    }

    this.vx += this.ax;
    this.vy += this.ay;
    this.vx *= this.dampFactor;
    this.vy *= this.dampFactor;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y);
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(0, 0, this.radius * this.scale, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}
