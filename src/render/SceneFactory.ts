import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  FogExp2,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
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
    const segments = 400;
    const halfWidth = this.track.width / 2;
    const positions = new Float32Array((segments + 1) * 2 * 3);
    const normals = new Float32Array((segments + 1) * 2 * 3);
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    const indices: number[] = [];
    const centers: Vector3[] = [];
    const tangents: Vector3[] = [];
    const up = new Vector3(0, 1, 0);
    const lateral = new Vector3();
    const left = new Vector3();
    const right = new Vector3();
    const distances = new Array(segments + 1).fill(0);

    for (let i = 0; i <= segments; i++) {
      const t = i === segments ? 1 : i / segments;
      const center = this.track.curve.getPointAt(t);
      const tangent = this.track.curve.getTangentAt(t).normalize();
      centers.push(center);
      tangents.push(tangent);
      if (i > 0) {
        distances[i] = distances[i - 1] + center.distanceTo(centers[i - 1]);
      }
    }

    for (let i = 0; i <= segments; i++) {
      const center = centers[i];
      const tangent = tangents[i];
      lateral.crossVectors(up, tangent).normalize();
      left.copy(center).addScaledVector(lateral, halfWidth);
      right.copy(center).addScaledVector(lateral, -halfWidth);

      const posIndex = i * 6;
      positions[posIndex] = left.x;
      positions[posIndex + 1] = left.y;
      positions[posIndex + 2] = left.z;
      positions[posIndex + 3] = right.x;
      positions[posIndex + 4] = right.y;
      positions[posIndex + 5] = right.z;

      const normIndex = posIndex;
      normals[normIndex] = 0;
      normals[normIndex + 1] = 1;
      normals[normIndex + 2] = 0;
      normals[normIndex + 3] = 0;
      normals[normIndex + 4] = 1;
      normals[normIndex + 5] = 0;

      const uvIndex = i * 4;
      const v = distances[i] * 0.08;
      uvs[uvIndex] = 0;
      uvs[uvIndex + 1] = v;
      uvs[uvIndex + 2] = 1;
      uvs[uvIndex + 3] = v;
    }

    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const material = new MeshStandardMaterial({
      map: createTrackTexture(),
      roughness: 0.6,
      metalness: 0.1,
      side: DoubleSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    this.buildTrackLines(scene, centers, tangents);
    this.buildStartFinish(scene, centers[0], tangents[0]);
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

  private buildTrackLines(scene: Scene, centers: Vector3[], tangents: Vector3[]) {
    const up = new Vector3(0, 1, 0);
    const centerCurve = new CatmullRomCurve3(centers.map((point) => point.clone()), true);
    const centerLine = centerCurve.getSpacedPoints(320);
    const centerGeometry = new BufferGeometry().setFromPoints(centerLine.map((p) => p.clone().add(new Vector3(0, 0.02, 0))));
    const centerMaterial = new LineBasicMaterial({ color: '#f5ffb8' });
    const center = new Line(centerGeometry, centerMaterial);
    scene.add(center);

    const offsets = [-this.track.width / 2 + 1.2, this.track.width / 2 - 1.2];
    for (const offset of offsets) {
      const points: Vector3[] = [];
      for (let i = 0; i < centers.length; i++) {
        const lateral = new Vector3().crossVectors(up, tangents[i]).normalize();
        points.push(centers[i].clone().addScaledVector(lateral, offset).add(new Vector3(0, 0.015, 0)));
      }
      const curve = new CatmullRomCurve3(points, true);
      const geometry = new BufferGeometry().setFromPoints(curve.getSpacedPoints(320));
      const material = new LineBasicMaterial({ color: '#ffffff', opacity: 0.6, transparent: true });
      const line = new Line(geometry, material);
      scene.add(line);
    }

    const railOffset = this.track.width / 2 + 0.4;
    const railMaterial = new MeshStandardMaterial({ color: '#c8ccd8', roughness: 0.35, metalness: 0.45 });
    const createRail = (direction: number) => {
      const railPoints: Vector3[] = [];
      for (let i = 0; i < centers.length; i++) {
        const lateral = new Vector3().crossVectors(up, tangents[i]).normalize();
        railPoints.push(centers[i].clone().addScaledVector(lateral, railOffset * direction).add(new Vector3(0, 0.4, 0)));
      }
      const curve = new CatmullRomCurve3(railPoints, true);
      const geometry = new TubeGeometry(curve, 300, 0.18, 6, true);
      const mesh = new Mesh(geometry, railMaterial);
      mesh.castShadow = true;
      scene.add(mesh);
    };
    createRail(1);
    createRail(-1);
  }

  private buildStartFinish(scene: Scene, start: Vector3, tangent: Vector3) {
    const anchor = new Group();
    const forward = tangent.clone().normalize();
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), forward);
    anchor.position.copy(start.clone().addScaledVector(forward, -2));
    anchor.setRotationFromQuaternion(orientation);
    scene.add(anchor);

    const bannerWidth = this.track.width * 0.7;
    const bannerHeight = 2.6;

    const poleGeometry = new BoxGeometry(0.25, bannerHeight, 0.25);
    const poleMaterial = new MeshStandardMaterial({ color: '#1c2035', metalness: 0.1, roughness: 0.6 });
    const leftPole = new Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-bannerWidth / 2, bannerHeight / 2, 0);
    leftPole.castShadow = true;
    leftPole.receiveShadow = true;
    anchor.add(leftPole);

    const rightPole = leftPole.clone();
    rightPole.position.x = bannerWidth / 2;
    anchor.add(rightPole);

    const bannerGeometry = new PlaneGeometry(bannerWidth, 1.2, 1, 1);
    const bannerMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#1b2136',
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.2,
      side: DoubleSide,
    });
    const banner = new Mesh(bannerGeometry, bannerMaterial);
    banner.position.set(0, bannerHeight - 0.5, 0);
    anchor.add(banner);

    const stripGeometry = new PlaneGeometry(this.track.width, 0.5);
    stripGeometry.rotateX(-Math.PI / 2);
    const stripMaterial = new MeshStandardMaterial({ color: '#f9f9f9', metalness: 0.05, roughness: 0.4 });
    const strip = new Mesh(stripGeometry, stripMaterial);
    strip.position.copy(start.clone().add(new Vector3(0, 0.02, 0)));
    strip.receiveShadow = true;
    scene.add(strip);
  }
}
