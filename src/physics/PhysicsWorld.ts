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
      .setFriction(1.2)
      .setRestitution(0.05);
    this.world.createCollider(groundCollider);

    const segments = 96;
    const wallHeight = 2.8;
    const wallThickness = 0.6;
    const halfWidth = this.track.width / 2;
    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const p1 = this.track.curve.getPointAt(t1);
      const p2 = this.track.curve.getPointAt(t2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const forward = p2.clone().sub(p1);
      const length = Math.max(4, forward.length());
      forward.normalize();
      const yaw = Math.atan2(forward.x, forward.z);
      const up = new Vector3(0, 1, 0);
      const lateral = new Vector3().crossVectors(up, forward).normalize();
      const baseHeight = (p1.y + p2.y) / 2;

      const roadCollider = RAPIER.ColliderDesc.cuboid(length / 2, 0.1, halfWidth)
        .setTranslation(mid.x, baseHeight - 0.05, mid.z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
        .setFriction(2.4)
        .setRestitution(0.02);
      this.world.createCollider(roadCollider);

      const guardOffset = halfWidth + wallThickness * 0.5;
      const leftCenter = mid.clone().add(lateral.clone().multiplyScalar(guardOffset));
      const rightCenter = mid.clone().add(lateral.clone().multiplyScalar(-guardOffset));

      const wallColliderLeft = RAPIER.ColliderDesc.cuboid(length / 2, wallHeight / 2, wallThickness / 2)
        .setTranslation(leftCenter.x, baseHeight + wallHeight / 2, leftCenter.z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
        .setFriction(0.9)
        .setRestitution(0.1);
      const wallColliderRight = RAPIER.ColliderDesc.cuboid(length / 2, wallHeight / 2, wallThickness / 2)
        .setTranslation(rightCenter.x, baseHeight + wallHeight / 2, rightCenter.z)
        .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) })
        .setFriction(0.9)
        .setRestitution(0.1);
      this.world.createCollider(wallColliderLeft);
      this.world.createCollider(wallColliderRight);
    }
  }
}
