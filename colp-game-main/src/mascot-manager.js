
import * as pc from 'playcanvas';

export class MascotManager {
  constructor(app, camera, gameWorld) {
    this.app = app;
    this.camera = camera;
    this.gameWorld = gameWorld;

    this.mascotAssets = [];
    this.mascotEntities = [];

    this.holes = [
      { id: 0, name: 'Front Left',  x: 0.1442, z: 0.0507,  peakY: 0.024, hideY: -0.055 },
      { id: 1, name: 'Back Left',   x: 0.0905, z: 0.0751,  peakY: 0.024, hideY: -0.055 },
      { id: 2, name: 'Back Center', x: 0.0848, z: -0.0088, peakY: 0.024, hideY: -0.055 },
      { id: 3, name: 'Back Right',  x: 0.0904, z: -0.0775, peakY: 0.024, hideY: -0.055 },
      { id: 4, name: 'Front Right', x: 0.1456, z: -0.0524, peakY: 0.024, hideY: -0.055 }
    ];

    this.mascotHomeCenters = [
      { x: 0.1442, z: 0.0483 },
      { x: 0.0924, z: 0.0757 },
      { x: 0.0893, z: -0.0056 },
      { x: 0.0927, z: -0.0775 },
      { x: 0.1448, z: -0.0470 }
    ];

    this.palette = [
      new pc.Color(0.98, 0.45, 0.09),
      new pc.Color(0.06, 0.73, 0.51),
      new pc.Color(0.94, 0.27, 0.27),
      new pc.Color(0.55, 0.36, 0.96),
      new pc.Color(0.92, 0.28, 0.60)
    ];

    this.spawnTimer = 0;
    this.nextSpawnInterval = 1.0;
    this.enabled = false;

    this.isFrenzyActive = false;
    this.frenzyTimer = 0;
    this.frenzyCooldown = 4.0;
  }

  async loadAssets() {
    for (let i = 1; i <= 5; i++) {
      const asset = await this.loadGlb(`/models/Mascot${i}.glb`);
      this.mascotAssets.push(asset);
    }

    for (let i = 0; i < 5; i++) {
      const homeHole = this.holes[i];
      const asset = this.mascotAssets[i];
      if (asset) {
        const holder = new pc.Entity('MascotHolder_' + i);
        this.gameWorld.addChild(holder);

        const entity = asset.resource.instantiateRenderEntity({
          castShadow: true,
          receiveShadow: true
        });

        entity.enabled = false;
        entity.setPosition(-0.092, -0.070 + homeHole.hideY, 0.001);
        this.applyColor(entity, this.palette[i]);

        holder.addChild(entity);

        this.mascotEntities.push({
          holder,
          entity,
          homeHole,
          hole: homeHole,
          currentHoleIndex: -1,
          deltaX: 0,
          deltaZ: 0,
          modelIndex: i,
          state: 'HIDDEN',
          stateTimer: 0,
          stayDuration: 1.0,
          currentY: homeHole.hideY,
          squashScale: 1.0,
          hasPowerup: false,
          hasPowerdown: false
        });
      }
    }
    console.log('Mascots initialized with precision centroids.');
  }

  loadGlb(url) {
    return new Promise((resolve) => {
      this.app.assets.loadFromUrl(url, 'container', (err, asset) => {
        if (!err && asset) resolve(asset);
        else resolve(null);
      });
    });
  }

  applyColor(entity, color) {
    const renders = entity.findComponents('render');
    renders.forEach(r => {
      r.meshInstances.forEach(mi => {
        const mat = new pc.StandardMaterial();
        mat.diffuse = color;
        mat.gloss = 0.3;
        mat.metalness = 0.05;
        mat.useMetalness = false;
        mat.specular = new pc.Color(0.08, 0.08, 0.08);
        mat.update();
        mi.material = mat;
      });
    });
  }

  shufflePalettes() {
    const shuffled = [...this.palette].sort(() => Math.random() - 0.5);
    this.mascotEntities.forEach((m, idx) => {
      this.applyColor(m.entity, shuffled[idx]);
    });
  }

  start() {
    this.enabled = true;
    this.spawnTimer = 0;
    this.nextSpawnInterval = 0.5;
    this.isFrenzyActive = false;
    this.frenzyTimer = 0;
    this.frenzyCooldown = 4.0;
    this.resetAll();
  }

  stop() {
    this.enabled = false;
    this.isFrenzyActive = false;
    this.resetAll();
  }

  resetAll() {
    this.mascotEntities.forEach(m => {
      m.state = 'HIDDEN';
      m.stateTimer = 0;
      m.currentHoleIndex = -1;
      m.deltaX = 0;
      m.deltaZ = 0;
      m.currentY = m.homeHole.hideY;
      m.squashScale = 1.0;
      m.stayDuration = 1.0;
      m.entity.enabled = false;
      m.entity.setPosition(-0.092, -0.070 + m.homeHole.hideY, 0.001);
      m.entity.setLocalScale(1, 1, 1);
      m.hasPowerup = false;
      m.hasPowerdown = false;
    });
  }

  spawnMascot() {
    const occupiedHoles = this.mascotEntities
      .filter(m => m.state !== 'HIDDEN' && m.currentHoleIndex >= 0)
      .map(m => m.currentHoleIndex);

    const freeHoles = [0, 1, 2, 3, 4].filter(h => !occupiedHoles.includes(h));
    const availableMascots = this.mascotEntities.filter(m => m.state === 'HIDDEN');

    if (freeHoles.length === 0 || availableMascots.length === 0) return;

    const targetHoleIndex = freeHoles[Math.floor(Math.random() * freeHoles.length)];
    const chosen = availableMascots[Math.floor(Math.random() * availableMascots.length)];

    chosen.currentHoleIndex = targetHoleIndex;
    chosen.hole = this.holes[targetHoleIndex];

    const homeCenter = this.mascotHomeCenters[chosen.modelIndex];
    chosen.deltaX = chosen.hole.x - homeCenter.x;
    chosen.deltaZ = chosen.hole.z - homeCenter.z;

    chosen.state = 'RISING';
    chosen.stateTimer = 0;
    chosen.squashScale = 1.0;
    chosen.currentY = chosen.hole.hideY;
    chosen.entity.enabled = true;

    chosen.stayDuration = (Math.random() < 0.26) ? 0.5 : 1.0;

    const roll = Math.random();
    chosen.hasPowerup = roll < 0.16;
    chosen.hasPowerdown = !chosen.hasPowerup && roll < 0.42;

    chosen.entity.setPosition(-0.092 + chosen.deltaX, -0.070 + chosen.currentY, 0.001 + chosen.deltaZ);
  }

  hitTestScreen(screenX, screenY, maxDistancePx = 85) {
    for (const m of this.mascotEntities) {
      if (m.state === 'UP' || m.state === 'RISING') {
        const sPos = this.getMascotScreenPos(m);
        const dx = screenX - sPos.x;
        const dy = screenY - sPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDistancePx) {
          return m;
        }
      }
    }
    return null;
  }

  onMascotHit(m) {
    if (m.state !== 'UP' && m.state !== 'RISING') return null;

    m.state = 'HIT';
    m.stateTimer = 0;
    m.squashScale = 0.35;

    const hitInfo = {
      mascot: m,
      hasPowerup: m.hasPowerup,
      hasPowerdown: m.hasPowerdown,
      screenPos: this.getMascotScreenPos(m)
    };

    m.hasPowerup = false;
    m.hasPowerdown = false;

    return hitInfo;
  }

  getMascotScreenPos(m) {
    const homeCenter = this.mascotHomeCenters[m.modelIndex];
    const worldPos = new pc.Vec3(
      -0.092 + (m.deltaX || 0) + homeCenter.x,
      -0.070 + m.currentY + 0.015,
      0.001 + (m.deltaZ || 0) + homeCenter.z
    );
    const screenPos = new pc.Vec3();
    this.camera.camera.worldToScreen(worldPos, screenPos);
    return { x: screenPos.x, y: screenPos.y };
  }

  getMascotHeadScreenPos(m) {
    const homeCenter = this.mascotHomeCenters[m.modelIndex];
    const worldPos = new pc.Vec3(
      -0.092 + (m.deltaX || 0) + homeCenter.x,
      -0.070 + m.currentY + 0.040,
      0.001 + (m.deltaZ || 0) + homeCenter.z
    );
    const screenPos = new pc.Vec3();
    this.camera.camera.worldToScreen(worldPos, screenPos);
    return { x: screenPos.x + 30, y: screenPos.y - 10 };
  }

  update(dt) {
    if (!this.enabled) return;

    if (!this.isFrenzyActive) {
      this.frenzyCooldown -= dt;
      if (this.frenzyCooldown <= 0) {
        this.frenzyCooldown = 4.0;
        if (Math.random() < 0.35) {
          this.isFrenzyActive = true;
          this.frenzyDuration = 6.0 + Math.random() * 3.0;
          this.frenzyTimer = this.frenzyDuration;
        }
      }
    } else {
      this.frenzyTimer -= dt;
      if (this.frenzyTimer <= 0) {
        this.isFrenzyActive = false;
        this.frenzyCooldown = 9.0;
      }
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnTimer = 0;
      if (this.isFrenzyActive) {
        this.nextSpawnInterval = 0.25 + Math.random() * 0.28;
      } else {
        this.nextSpawnInterval = 0.75 + Math.random() * 1.05;
      }

      this.spawnMascot();

      if (Math.random() < 0.15) {
        this.shufflePalettes();
      }
    }

    for (const m of this.mascotEntities) {
      if (m.state === 'HIDDEN') continue;

      const hole = m.hole;

      if (m.state === 'RISING') {
        m.stateTimer += dt;
        const riseSpeed = 0.18;
        const t = Math.min(1, m.stateTimer / riseSpeed);
        m.currentY = hole.hideY + (hole.peakY - hole.hideY) * Math.sin(t * Math.PI / 2);

        if (t >= 1) {
          m.state = 'UP';
          m.stateTimer = 0;
          m.currentY = hole.peakY;
        }
      } else if (m.state === 'UP') {
        m.stateTimer += dt;
        m.currentY = hole.peakY;

        const targetStay = m.stayDuration || 1.0;
        if (m.stateTimer >= targetStay) {
          m.state = 'SINKING';
          m.stateTimer = 0;
        }
      } else if (m.state === 'SINKING') {
        m.stateTimer += dt;
        const sinkSpeed = 0.22;
        const t = Math.min(1, m.stateTimer / sinkSpeed);
        m.currentY = hole.peakY - (hole.peakY - hole.hideY) * (t * t);

        if (t >= 1) {
          m.state = 'HIDDEN';
          m.stateTimer = 0;
          m.currentY = hole.hideY;
          m.currentHoleIndex = -1;
          m.hasPowerup = false;
          m.hasPowerdown = false;
          m.entity.enabled = false;
        }
      } else if (m.state === 'HIT') {
        m.stateTimer += dt;
        const hitDuration = 0.22;
        const t = Math.min(1, m.stateTimer / hitDuration);

        m.currentY = hole.peakY - (hole.peakY - hole.hideY) * t;
        m.squashScale = 0.35 + t * 0.65;

        if (t >= 1) {
          m.state = 'HIDDEN';
          m.stateTimer = 0;
          m.currentY = hole.hideY;
          m.currentHoleIndex = -1;
          m.squashScale = 1.0;
          m.hasPowerup = false;
          m.hasPowerdown = false;
          m.entity.enabled = false;
        }
      }

      m.entity.setPosition(-0.092 + (m.deltaX || 0), -0.070 + m.currentY, 0.001 + (m.deltaZ || 0));
      m.entity.setLocalScale(1, m.squashScale, 1);
    }
  }
}
