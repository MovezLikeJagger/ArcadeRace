import type RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';

export type CarControls = {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: number;
};

export type CarTelemetry = {
  speed: number;
  slip: number;
  rpm: number;
};

export type CarTuning = {
  enginePower: number;
  brakeForce: number;
  maxSteer: number;
  tireGripFront: number;
  tireGripRear: number;
  handbrakeGrip: number;
  mass: number;
  downforce: number;
  drag: number;
  rollingResistance: number;
  differentialLock: number;
};

const defaultTuning: CarTuning = {
  enginePower: 12000,
  brakeForce: 8000,
  maxSteer: 0.6,
  tireGripFront: 9,
  tireGripRear: 9,
  handbrakeGrip: 3,
  mass: 1100,
  downforce: 12,
  drag: 0.35,
  rollingResistance: 8,
  differentialLock: 0.1,
};

const forward = new Vector3();
const right = new Vector3();
const up = new Vector3();

export class BicycleCar {
  private controls: CarControls = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
  private readonly body: RAPIER.RigidBody;
  private slip = 0;
  private rpm = 0;
  private steeringAngle = 0;
  private readonly chassisSize = { x: 0.9, y: 0.3, z: 0.45 };
  private readonly tuning: CarTuning;

  constructor(
    private readonly rapier: typeof RAPIER,
    private readonly world: RAPIER.World,
    spawnPosition: Vector3,
    spawnHeading: number,
    tuning: Partial<CarTuning> = {}
  ) {
    this.tuning = { ...defaultTuning, ...tuning };
    const bodyDesc = this.rapier.RigidBodyDesc.dynamic()
      .setTranslation(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      .setRotation({ x: 0, y: Math.sin(spawnHeading / 2), z: 0, w: Math.cos(spawnHeading / 2) })
      .setLinearDamping(0.02)
      .setAngularDamping(2.5);
    this.body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.rapier.ColliderDesc.cuboid(this.chassisSize.x, this.chassisSize.y, this.chassisSize.z)
      .setDensity(this.tuning.mass / (this.chassisSize.x * this.chassisSize.y * this.chassisSize.z * 8))
      .setFriction(1.2)
      .setRestitution(0.1);
    this.world.createCollider(colliderDesc, this.body);
  }

  getRigidBody() {
    return this.body;
  }

  setControls(controls: Partial<CarControls>) {
    this.controls = { ...this.controls, ...controls };
  }

  teleport(position: Vector3, heading: number) {
    this.body.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }, true);
  }

  step(dt: number) {
    const transform = this.body.rotation();
    const quat = new Quaternion(transform.x, transform.y, transform.z, transform.w);
    forward.set(0, 0, -1).applyQuaternion(quat);
    right.copy(forward).crossVectors(forward, new Vector3(0, 1, 0)).normalize();
    up.crossVectors(forward, right).normalize();

    const velocity = this.body.linvel();
    const vel = new Vector3(velocity.x, velocity.y, velocity.z);
    const speedForward = vel.dot(forward);
    const speedSide = vel.dot(right);
    const speed = vel.length();

    const steerTarget = this.controls.steer * this.tuning.maxSteer;
    this.steeringAngle += (steerTarget - this.steeringAngle) * Math.min(1, dt * 12);

    const engineForce = this.controls.throttle * this.tuning.enginePower;
    const brakeForce = (this.controls.brake + this.controls.handbrake) * this.tuning.brakeForce;

    const tireGripRear = this.controls.handbrake > 0.1 ? this.tuning.handbrakeGrip : this.tuning.tireGripRear;
    const tireGripFront = this.tuning.tireGripFront;

    const lateralForceRear = -speedSide * tireGripRear;
    const lateralForceFront = -speedSide * tireGripFront * (1 + Math.abs(this.steeringAngle) * 1.5);

    const forceForward = engineForce - Math.sign(speedForward) * brakeForce - speedForward * this.tuning.rollingResistance;
    const aerodynamicDrag = speed * speed * this.tuning.drag;
    const downforce = speed * this.tuning.downforce;

    const forceVec = forward.clone().multiplyScalar(forceForward - aerodynamicDrag).add(up.clone().multiplyScalar(-downforce));
    const lateralVec = right.clone().multiplyScalar(lateralForceFront + lateralForceRear);

    const totalForce = forceVec.add(lateralVec);
    this.body.applyForce({ x: totalForce.x, y: totalForce.y, z: totalForce.z }, true);

    const torque = up.clone().multiplyScalar(this.steeringAngle * speedForward * tireGripFront * 0.5);
    this.body.applyTorque({ x: torque.x, y: torque.y, z: torque.z }, true);

    this.slip = (Math.abs(lateralForceRear) + Math.abs(lateralForceFront)) / Math.max(1, speed * 50);
    this.rpm = 900 + Math.abs(speedForward) * 120;
  }

  getTelemetry(): CarTelemetry {
    const vel = this.body.linvel();
    const velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    return { speed: velocity, slip: this.slip, rpm: this.rpm };
  }

  getTransform() {
    const translation = this.body.translation();
    const rotation = this.body.rotation();
    return {
      position: new Vector3(translation.x, translation.y, translation.z),
      rotation: new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
    };
  }
}
