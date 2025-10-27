import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { createOvalTrack, TrackDefinition } from '../game/Track';
import { BicycleCar, CarControls } from './BicycleCar';

export type PhysicsInitResult = {
  car: BicycleCar;
  track: TrackDefinition;
};

const FIXED_STEP = 1 / 100;

export class PhysicsWorld {
  private world!: RAPIER.World;
  private car!: BicycleCar;
  private track: TrackDefinition = createOvalTrack();
  private accumulator = 0;
  private interpolationAlpha = 0;
  private lastTransform = { position: new Vector3(), rotation: new Quaternion() };
  private currentTransform = { position: new Vector3(), rotation: new Quaternion() };

  async init(): Promise<PhysicsInitResult> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.buildStaticColliders();
    this.car = new BicycleCar(RAPIER, this.world, this.track.spawnPoint, this.track.spawnHeading);
    const transform = this.car.getTransform();
    this.currentTransform = {
      position: transform.position.clone(),
      rotation: transform.rotation.clone(),
    };
    this.lastTransform = {
      position: transform.position.clone(),
      rotation: transform.rotation.clone(),
    };
    return { car: this.car, track: this.track };
  }

  getTrack() {
    return this.track;
  }

  getWorld() {
    return this.world;
  }

  step(dt: number, controls: CarControls) {
    if (!this.car) return;
    this.accumulator += dt;
    this.car.setControls(controls);

    while (this.accumulator >= FIXED_STEP) {
      const previous = this.car.getTransform();
      this.lastTransform = {
        position: previous.position.clone(),
        rotation: previous.rotation.clone(),
      };
      this.car.step(FIXED_STEP);
      this.world.step();
      const current = this.car.getTransform();
      this.currentTransform = {
        position: current.position.clone(),
        rotation: current.rotation.clone(),
      };
      this.accumulator -= FIXED_STEP;
    }
    this.interpolationAlpha = this.accumulator / FIXED_STEP;
  }

  getInterpolatedTransform() {
    return {
      position: this.lastTransform.position
        .clone()
        .lerp(this.currentTransform.position, this.interpolationAlpha),
      rotation: this.lastTransform.rotation
        .clone()
        .slerp(this.currentTransform.rotation, this.interpolationAlpha),
    };
  }

  getCar() {
    return this.car;
  }

  resetToCheckpoint(position: Vector3, heading: number) {
    this.car.teleport(position, heading);
    this.accumulator = 0;
    const transform = this.car.getTransform();
    this.currentTransform = {
      position: transform.position.clone(),
      rotation: transform.rotation.clone(),
    };
    this.lastTransform = {
      position: transform.position.clone(),
      rotation: transform.rotation.clone(),
    };
  }

  private buildStaticColliders() {
    const groundCollider = RAPIER.ColliderDesc.cuboid(200, 0.2, 200)
      .setTranslation(0, -0.2, 0)
      .setFriction(1.5)
      .setRestitution(0.05);
    this.world.createCollider(groundCollider);

    const segments = 64;
    const radiusX = 45;
    const radiusZ = 25;
    const wallHeight = 3;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;
      const x1 = Math.cos(angle) * radiusX;
      const z1 = Math.sin(angle) * radiusZ;
      const x2 = Math.cos(nextAngle) * radiusX;
      const z2 = Math.sin(nextAngle) * radiusZ;
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const rotation = Math.atan2(z2 - z1, x2 - x1);
      const collider = RAPIER.ColliderDesc.cuboid(length / 2, wallHeight / 2, 1)
        .setTranslation(midX, wallHeight / 2, midZ)
        .setRotation({ x: 0, y: Math.sin(rotation / 2), z: 0, w: Math.cos(rotation / 2) })
        .setRestitution(0.2)
        .setFriction(1.2);
      this.world.createCollider(collider);
    }
  }
}
