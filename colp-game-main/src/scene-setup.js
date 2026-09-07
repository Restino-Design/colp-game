import * as pc from 'playcanvas';

export class SceneSetup {
  constructor(app) {
    this.app = app;
    this.camera = null;
    this.gameWorld = null;
    this.machineEntity = null;
  }

  async setupScene() {
    this.gameWorld = new pc.Entity('GameWorld');
    this.gameWorld.setPosition(0, 0.01, 0);
    this.app.root.addChild(this.gameWorld);

    this.setupCamera();
    this.setupLighting();

    try {
      await this.loadMachine();
    } catch (err) {
      console.error('Erro ao carregar o modelo 3D:', err);
    }
  } // <-- ESSA CHAVE FALTAVA AQUI!

  setupCamera() {
    const camera = new pc.Entity('MainCamera');
    camera.addComponent('camera', {
      clearColor: new pc.Color(0, 0, 0, 0),
      fov: 34,
      nearClip: 0.05,
      farClip: 100
    });

    camera.setPosition(0.48, 0.17, 0.0);
    camera.lookAt(new pc.Vec3(0.04, 0.07, 0.0));

    this.app.root.addChild(camera);
    this.camera = camera;
  }

  setupLighting() {
    this.app.scene.ambientLight = new pc.Color(0.48, 0.48, 0.52);

    const keyLight = new pc.Entity('KeyLight');
    keyLight.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.95, 0.94, 0.92),
      intensity: 0.9,
      castShadows: true,
      shadowDistance: 2.0,
      shadowResolution: 2048,
      shadowBias: 0.04,
      normalOffsetBias: 0.02
    });
    keyLight.setEulerAngles(55, 75, 0);
    this.app.root.addChild(keyLight);

    const fillLight = new pc.Entity('FillLight');
    fillLight.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.75, 0.82, 0.92),
      intensity: 0.4,
      castShadows: false
    });
    fillLight.setEulerAngles(35, -75, 0);
    this.app.root.addChild(fillLight);
  }

  loadMachine() {
    return new Promise((resolve) => {
      this.app.assets.loadFromUrl('/models/Machine.glb', 'container', (err, asset) => {
        if (err || !asset) {
          console.error('Failed to load Machine.glb:', err);
          resolve(null);
          return;
        }

        const machine = asset.resource.instantiateRenderEntity({
          castShadow: true,
          receiveShadow: true
        });

        machine.setPosition(-0.092, -0.070, 0.001);

        const meshInstances = machine.findComponents('render').flatMap(r => r.meshInstances);
        meshInstances.forEach(mi => {
          const matName = mi.material ? mi.material.name : '';

          if (matName === 'Letter_C') {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.88, 0.66, 0.60);
            mat.gloss = 0.2;
            mat.metalness = 0.0;
            mat.useMetalness = false;
            mat.specular = new pc.Color(0.04, 0.04, 0.04);
            mat.update();
            mi.material = mat;
          } else if (matName === 'Letter_O') {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.82, 0.66, 0.85);
            mat.gloss = 0.2;
            mat.metalness = 0.0;
            mat.useMetalness = false;
            mat.specular = new pc.Color(0.04, 0.04, 0.04);
            mat.update();
            mi.material = mat;
          } else if (matName === 'Letter_L') {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.83, 0.85, 0.74);
            mat.gloss = 0.2;
            mat.metalness = 0.0;
            mat.useMetalness = false;
            mat.specular = new pc.Color(0.04, 0.04, 0.04);
            mat.update();
            mi.material = mat;
          } else if (matName === 'Letter_P') {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.56, 0.58, 0.60);
            mat.gloss = 0.2;
            mat.metalness = 0.0;
            mat.useMetalness = false;
            mat.specular = new pc.Color(0.04, 0.04, 0.04);
            mat.update();
            mi.material = mat;
          } else {
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(0.86, 0.86, 0.88);
            mat.gloss = 0.05;
            mat.metalness = 0.0;
            mat.useMetalness = false;
            mat.specular = new pc.Color(0.03, 0.03, 0.03);
            mat.update();
            mi.material = mat;
          }
        });

        this.gameWorld.addChild(machine);
        this.machineEntity = machine;
        console.log('Machine loaded with clean matte materials.');
        resolve(machine);
      });
    });
  }
}
