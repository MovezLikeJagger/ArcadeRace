import {
  AmbientLight,
  Color,
  DirectionalLight,
  Euler,
  FogExp2,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Scene,
  TubeGeometry,
  Vector3,
} from 'three';
import { createCrowdTexture, createGrassTexture, createTrackTexture } from '../assets/textures';
import { createLowPolyCar } from '../assets/LowPolyCar';
import { TrackDefinition } from '../game/Track';

export type SceneAssets = {
  scene: Scene;
  carPrefab: Group;
};

export class SceneFactory {
  constructor(private readonly track: TrackDefinition) {}

  build(): SceneAssets {
    const scene = new Scene();
    scene.background = new Color('#0d0f1a');
    scene.fog = new FogExp2('#0d0f1a', 0.008);

    const ambient = new AmbientLight('#7c87ff', 0.3);
    scene.add(ambient);

    const dirLight = new DirectionalLight('#ffffff', 1.3);
    dirLight.position.set(40, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    this.buildGround(scene);
    this.buildTrack(scene);
    this.buildCrowd(scene);
    this.buildProps(scene);

    const carPrefab = createLowPolyCar();

    return { scene, carPrefab };
  }

  private buildGround(scene: Scene) {
    const groundGeometry = new PlaneGeometry(400, 400, 1, 1);
    groundGeometry.rotateX(-Math.PI / 2);
    const grassTexture = createGrassTexture();
    const material = new MeshStandardMaterial({ map: grassTexture, roughness: 1 });
    const mesh = new Mesh(groundGeometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  private buildTrack(scene: Scene) {
    const tube = new TubeGeometry(this.track.curve, 200, 5, 32, true);
    const material = new MeshStandardMaterial({ map: createTrackTexture(), roughness: 0.85, metalness: 0.05 });
    const mesh = new Mesh(tube, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  private buildCrowd(scene: Scene) {
    const billboardGeometry = new PlaneGeometry(10, 4);
    const material = new MeshStandardMaterial({ map: createCrowdTexture(), transparent: true, side: 2 });
    const crowd = new InstancedMesh(billboardGeometry, material, 40);
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 60 + Math.sin(i) * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const rotation = new Euler(0, angle + Math.PI, 0, 'XYZ');
      quaternion.setFromEuler(rotation);
      matrix.compose(new Vector3(x, 2, z), quaternion, scale);
      crowd.setMatrixAt(i, matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
    scene.add(crowd);
  }

  private buildProps(scene: Scene) {
    const flagGeometry = new PlaneGeometry(2, 1.2);
    const flagMaterial = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 });
    const flags = new InstancedMesh(flagGeometry, flagMaterial, 20);
    const matrix = new Matrix4();
    const quaternion = new Quaternion();
    const scale = new Vector3(1, 1, 1);
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 45 + (i % 2);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const rotation = new Euler(0, angle + Math.PI / 2, 0, 'XYZ');
      quaternion.setFromEuler(rotation);
      matrix.compose(new Vector3(x, 1.5, z), quaternion, scale);
      flags.setMatrixAt(i, matrix);
    }
    flags.instanceMatrix.needsUpdate = true;
    scene.add(flags);
  }
}
