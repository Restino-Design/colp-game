
export class VFXManager {
  constructor(canvas, cameraEntity) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cameraEntity = cameraEntity;
    this.mascotManager = null;
    this.activeVFX = [];
    this.floatingTexts = [];
    this.vfxData = [];
    this.powerupImg = null;
    this.powerdownImg = null;
    this.shakeAmount = 0;
    this.shakeDecay = 0.86;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setMascotManager(mascotManager) {
    this.mascotManager = mascotManager;
  }

  async preload() {
    this.powerupImg = new Image();
    this.powerupImg.src = '/textures/Powerup.png';

    this.powerdownImg = new Image();
    this.powerdownImg.src = '/textures/Powerdown.png';

    for (let i = 1; i <= 8; i++) {
      try {
        const metaRes = await fetch(`/vfx/knock_${i}/meta.json`);
        const meta = await metaRes.json();
        const images = [];
        for (const frameFile of meta.frames) {
          const img = new Image();
          img.src = `/vfx/knock_${i}/${frameFile}`;
          images.push(img);
        }
        this.vfxData.push({
          index: i,
          images,
          delays: meta.delays,
          width: meta.width,
          height: meta.height,
          totalDurationMs: Math.min(meta.totalDurationMs, 2500)
        });
      } catch (e) {
        console.warn('Failed to load VFX', i, e);
      }
    }
    console.log('VFX & Power items loaded:', this.vfxData.length, 'types');
  }

  triggerKnockVFX(screenX, screenY, scale = 1.0, multiplier = 1) {
    if (this.vfxData.length === 0) return;
    const vfxIdx = Math.floor(Math.random() * this.vfxData.length);
    const data = this.vfxData[vfxIdx];

    this.activeVFX.push({
      data,
      x: screenX,
      y: screenY,
      scale: scale,
      startTime: performance.now(),
      currentFrame: 0,
      elapsed: 0
    });

    this.shakeAmount = 10 + (multiplier - 1) * 10.0;

    const canvasEl = document.getElementById('application-canvas');
    if (canvasEl) {
      const cssX = (Math.random() * 2 - 1) * (4 + multiplier * 4.0);
      const cssY = (Math.random() * 2 - 1) * (4 + multiplier * 4.0);
      canvasEl.style.transform = `translate(${cssX}px, ${cssY}px)`;
      setTimeout(() => {
        if (canvasEl) canvasEl.style.transform = '';
      }, 70);
    }
  }

  triggerScoreText(screenX, screenY, text, color = '#f59e0b', subtext = null) {
    this.floatingTexts.push({
      x: screenX + (Math.random() * 20 - 10),
      y: screenY - 20,
      text,
      subtext,
      color,
      startTime: performance.now(),
      duration: 1200,
      scale: 1.0
    });
  }

  update(dt) {
    const now = performance.now();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.shakeAmount > 0.1) {
      const sx = (Math.random() * 2 - 1) * this.shakeAmount;
      const sy = (Math.random() * 2 - 1) * this.shakeAmount;
      this.ctx.save();
      this.ctx.translate(sx, sy);
      this.shakeAmount *= this.shakeDecay;
    } else {
      this.ctx.save();
    }

    if (this.mascotManager && this.mascotManager.enabled) {
      for (const m of this.mascotManager.mascotEntities) {
        if ((m.hasPowerup || m.hasPowerdown) && (m.state === 'RISING' || m.state === 'UP' || m.state === 'SINKING')) {
          const headPos = this.mascotManager.getMascotHeadScreenPos(m);
          const img = m.hasPowerup ? this.powerupImg : this.powerdownImg;

          if (img && img.complete && img.naturalWidth > 0) {
            const floatOffset = Math.sin(now * 0.008 + m.modelIndex * 1.5) * 4;
            const pulseScale = 1.0 + Math.sin(now * 0.012 + m.modelIndex) * 0.08;
            const iconSize = 46 * pulseScale;

            this.ctx.save();
            this.ctx.translate(headPos.x, headPos.y + floatOffset);
            this.ctx.shadowColor = m.hasPowerup ? '#10b981' : '#ef4444';
            this.ctx.shadowBlur = 14;

            this.ctx.drawImage(
              img,
              -iconSize / 2,
              -iconSize / 2,
              iconSize,
              iconSize
            );
            this.ctx.restore();
          }
        }
      }
    }

    for (let i = this.activeVFX.length - 1; i >= 0; i--) {
      const vfx = this.activeVFX[i];
      const elapsed = now - vfx.startTime;

      if (elapsed > vfx.data.totalDurationMs) {
        this.activeVFX.splice(i, 1);
        continue;
      }

      let acc = 0;
      let frameIdx = 0;
      for (let f = 0; f < vfx.data.delays.length; f++) {
        acc += vfx.data.delays[f];
        if (elapsed <= acc) {
          frameIdx = f;
          break;
        }
      }
      if (frameIdx >= vfx.data.images.length) frameIdx = vfx.data.images.length - 1;

      const img = vfx.data.images[frameIdx];
      if (img && img.complete && img.naturalWidth > 0) {
        const targetMaxDim = 125 * vfx.scale;
        const maxDim = Math.max(vfx.data.width, vfx.data.height);
        const factor = targetMaxDim / maxDim;
        const renderW = vfx.data.width * factor;
        const renderH = vfx.data.height * factor;

        this.ctx.drawImage(
          img,
          vfx.x - renderW / 2,
          vfx.y - renderH / 2,
          renderW,
          renderH
        );
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      const elapsed = now - ft.startTime;
      const progress = elapsed / ft.duration;

      if (progress >= 1) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      const alpha = 1 - Math.pow(progress, 2);
      const curY = ft.y - progress * 80;
      const curScale = progress < 0.2 ? 0.6 + (progress / 0.2) * 0.6 : 1.2 - (progress - 0.2) * 0.25;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      this.ctx.translate(ft.x, curY);
      this.ctx.scale(curScale, curScale);

      this.ctx.font = '900 32px "Fredoka", "Outfit", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
      this.ctx.fillText(ft.text, 2, 2);

      this.ctx.fillStyle = ft.color;
      this.ctx.fillText(ft.text, 0, 0);

      if (ft.subtext) {
        this.ctx.font = '800 16px "Outfit", sans-serif';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(ft.subtext, 0, 26);
      }

      this.ctx.restore();
    }

    this.ctx.restore();
  }
}
