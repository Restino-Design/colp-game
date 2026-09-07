import * as pc from 'playcanvas';
import { SceneSetup } from './scene-setup.js';
import { MascotManager } from './mascot-manager.js';
import { HammerController } from './hammer-controller.js';
import { VFXManager } from './vfx-manager.js';
import { AudioManager } from './audio-manager.js';
import { LeaderboardClient } from './supabase-client.js';
import { GameState } from './game-state.js';
import { UIController } from './ui-controller.js';

async function initGame() {
  console.log('Initializing Colp 3D Arcade Game...');

  const canvas = document.getElementById('application-canvas');
  const vfxCanvas = document.getElementById('vfx-canvas');

  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.Touch(canvas),
    graphicsDeviceOptions: {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    }
  });

  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());

  app.start();

  const sceneSetup = new SceneSetup(app);
  await sceneSetup.setupScene();

  const vfxManager = new VFXManager(vfxCanvas, sceneSetup.camera);
  await vfxManager.preload();

  const audioManager = new AudioManager();
  await audioManager.init();

  const mascotManager = new MascotManager(app, sceneSetup.camera, sceneSetup.gameWorld);
  await mascotManager.loadAssets();

  vfxManager.setMascotManager(mascotManager);

  const hammerController = new HammerController(app, sceneSetup.camera, mascotManager);
  await hammerController.loadHammer();

  const leaderboard = new LeaderboardClient();
  const gameState = new GameState(leaderboard);
  const uiController = new UIController(gameState, leaderboard, audioManager);

  hammerController.onHitEvent = (hitData) => {
    audioManager.playRandomKnock();

    const res = gameState.handleHit(hitData);
    if (!res) return;

    vfxManager.triggerKnockVFX(hitData.screenPos.x, hitData.screenPos.y, 1.0, res.multiplier);

    let color = '#f59e0b';
    let sub = null;
    if (res.multiplier > 1) {
      sub = `COMBO ${res.multiplier}x!`;
      color = res.multiplier >= 5 ? '#ec4899' : '#8b5cf6';
    }

    if (res.timeBonus > 0) {
      vfxManager.triggerScoreText(hitData.screenPos.x, hitData.screenPos.y, `+${res.pointsGained}`, '#10b981', '🍄 +8s BONUS!');
    } else if (res.timeBonus < 0) {
      vfxManager.triggerScoreText(hitData.screenPos.x, hitData.screenPos.y, `+${res.pointsGained}`, '#ef4444', '💀 -15s PENALTY!');
    } else {
      vfxManager.triggerScoreText(hitData.screenPos.x, hitData.screenPos.y, `+${res.pointsGained}`, color, sub);
    }
  };

  uiController.onStartGameRequested = () => {
    gameState.startGame();
    mascotManager.start();
    hammerController.enabled = true;
    audioManager.playMusic();
  };

  gameState.onGameOver = (stats) => {
    mascotManager.stop();
    hammerController.enabled = false;
    audioManager.stopMusic();
    uiController.showGameOver(stats);
  };

  app.on('update', (dt) => {
    gameState.update(dt);
    mascotManager.update(dt);
    hammerController.update(dt);
    vfxManager.update(dt);
  });

  console.log('Colp 3D Game running successfully!');
}

window.addEventListener('DOMContentLoaded', initGame);

// Força o encerramento do AudioContext e do WebGL ao fechar/recarregar
function cleanupGame() {
  // 1. Encerra a aplicação do PlayCanvas
  if (window.pcApp) {
    try {
      window.pcApp.destroy();
      window.pcApp = null;
    } catch (e) {}
  }

  // 2. Garante que o AudioContext da Web Audio API seja destruído
  if (window.audioManager && window.audioManager.ctx) {
    try {
      if (window.audioManager.ctx.state !== 'closed') {
        window.audioManager.ctx.close();
      }
    } catch (e) {}
  }
}

// O Chrome exige 'pagehide' + 'beforeunload' para garantir a liberação de VRAM
window.addEventListener('pagehide', cleanupGame);
window.addEventListener('beforeunload', cleanupGame);
