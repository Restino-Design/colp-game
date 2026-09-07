
import * as pc from 'playcanvas';

export class HammerController {
  constructor(app, camera, mascotManager) {
    this.app = app;
    this.camera = camera;
    this.mascotManager = mascotManager;
    this.hammerRoot = null;
    this.hammerMeshEntity = null;

    this.screenPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.targetPos = new pc.Vec3(0.06, 0.13, 0.0);
    this.currentPos = new pc.Vec3(0.06, 0.13, 0.0);

    this.isHitting = false;
    this.hitTimer = 0;
    this.hitDuration = 0.16;

    this.onHitEvent = null;
    this.enabled = false;

    this.aimCursorEl = document.getElementById('aim-cursor');
    this.aimClickEl = document.getElementById('aim-click');

    this.setupPointerListeners();
  }

  async loadHammer() {
    return new Promise((resolve) => {
      this.app.assets.loadFromUrl('/models/Hammer.glb', 'container', (err, asset) => {
        if (!err && asset) {
          this.hammerRoot = new pc.Entity('HammerRoot');

          const hammerInstance = asset.resource.instantiateRenderEntity({
            castShadow: true,
            receiveShadow: false
          });

          hammerInstance.setPosition(-0.173, -0.062, 0.070);
          this.hammerRoot.setLocalScale(1.6, 1.6, 1.6);

          const meshInstances = hammerInstance.findComponents('render').flatMap(r => r.meshInstances);
          meshInstances.forEach(mi => {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.92, 0.82, 0.35);
            mat.metalness = 0.88;
            mat.gloss = 0.92;
            mat.useMetalness = true;
            mat.update();
            mi.material = mat;
          });

          this.hammerRoot.addChild(hammerInstance);
          this.hammerRoot.setPosition(this.currentPos);
          this.app.root.addChild(this.hammerRoot);
          this.hammerMeshEntity = hammerInstance;
          console.log('Hammer loaded with Maya Image 3 pose.');
        }
        resolve(this.hammerRoot);
      });
    });
  }

  setupPointerListeners() {
    const canvas = this.app.graphicsDevice.canvas;

    const onPointerMove = (e) => {
      if (!this.camera) return;
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : window.innerWidth / 2);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : window.innerHeight / 2);

      this.screenPos.x = clientX;
      this.screenPos.y = clientY;

      if (this.aimCursorEl) {
        this.aimCursorEl.style.transform = `translate3d(${clientX}px, ${clientY}px, 0) translate(-50%, -50%)`;

        // Se estiver em menus sobre botões/inputs com cursor padrão nativo, oculta suavemente o retículo
        const isOverUI = !this.enabled && e.target && e.target.closest && e.target.closest('.glass-card, .btn, input');
        this.aimCursorEl.style.opacity = isOverUI ? '0' : '1';
      }

      const ray = this.camera.camera.screenToWorld(clientX, clientY, 0.42);
      this.targetPos.x = ray.x;
      this.targetPos.y = ray.y - 0.015;
      this.targetPos.z = ray.z;
    };

    const onPointerDown = (e) => {
      if (!this.enabled) return;
      if (e.button !== undefined && e.button !== 0) return;

      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : this.screenPos.x);
      const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : this.screenPos.y);

      this.screenPos.x = clientX;
      this.screenPos.y = clientY;

      this.triggerHit();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);

    document.addEventListener('mouseleave', () => {
      if (this.aimCursorEl) this.aimCursorEl.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      if (this.aimCursorEl) this.aimCursorEl.style.opacity = '1';
    });
  }

  triggerHit() {
    if (this.isHitting) return;
    this.isHitting = true;
    this.hitTimer = 0;

    this.triggerAimClick();

    const hitResult = this.mascotManager.hitTestScreen(this.screenPos.x, this.screenPos.y, 85);
    if (hitResult) {
      const hitData = this.mascotManager.onMascotHit(hitResult);
      if (hitData && this.onHitEvent) {
        this.onHitEvent(hitData);
      }
    }
  }

  triggerAimClick() {
    if (!this.aimClickEl) return;
    this.aimClickEl.classList.remove('active');
    void this.aimClickEl.offsetWidth;
    this.aimClickEl.classList.add('active');
  }

  update(dt) {
    if (!this.hammerRoot) return;

    const lerpSpeed = 28.0;
    this.currentPos.x += (this.targetPos.x - this.currentPos.x) * Math.min(1, dt * lerpSpeed);
    this.currentPos.y += (this.targetPos.y - this.currentPos.y) * Math.min(1, dt * lerpSpeed);
    this.currentPos.z += (this.targetPos.z - this.currentPos.z) * Math.min(1, dt * lerpSpeed);

    let hitOffsetY = 0;
    let hitAngleZ = 0;
    let hitAngleX = 0;

    if (this.isHitting) {
      this.hitTimer += dt;
      const progress = this.hitTimer / this.hitDuration;

      if (progress < 0.45) {
        const slam = progress / 0.45;
        const ease = Math.sin(slam * Math.PI / 2);
        hitOffsetY = -0.035 * ease;
        hitAngleZ = -45 * ease;
        hitAngleX = -20 * ease;
      } else if (progress < 1.0) {
        const recover = (progress - 0.45) / 0.55;
        hitOffsetY = -0.035 * (1 - recover);
        hitAngleZ = -45 * (1 - recover);
        hitAngleX = -20 * (1 - recover);
      } else {
        this.isHitting = false;
      }
    }

    this.hammerRoot.setPosition(this.currentPos.x, this.currentPos.y + hitOffsetY, this.currentPos.z);
    this.hammerRoot.setEulerAngles(-15 + hitAngleX, -75, 35 + hitAngleZ);
  }
}
