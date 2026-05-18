import './styles.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();
ctx.fillStyle = '#bfeeff';
ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
ctx.fillStyle = '#2f3b48';
ctx.font = '20px system-ui';
ctx.fillText('Arrow Physics Sandbox', 24, 44);
