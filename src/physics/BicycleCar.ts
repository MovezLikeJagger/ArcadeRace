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
const worldUp = new Vector3(0, 1, 0);

export class BicycleCar {
  private controls: CarControls = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
  private smoothed: CarControls = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
  private readonly body: RAPIER.RigidBody;
  private slip = 0;
  private rpm = 0;
  private steeringAngle = 0;
  private readonly chassisSize = { x: 0.9, y: 0.3, z: 0.45 };
  private readonly tuning: CarTuning;
  private readonly cgToFrontAxle = 1.5;
  private readonly cgToRearAxle = 1.2;
  private readonly maxSpeed = 78;

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
      .setLinearDamping(0.04)
      .setAngularDamping(5.2)
      .setCcdEnabled(true);
    this.body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.rapier.ColliderDesc.cuboid(this.chassisSize.x, this.chassisSize.y, this.chassisSize.z)
      .setDensity(this.tuning.mass / (this.chassisSize.x * this.chassisSize.y * this.chassisSize.z * 8))
      .setFriction(1.6)
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
    this.smoothed = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
    this.controls = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
    this.steeringAngle = 0;
  }

  step(dt: number) {
    const transform = this.body.rotation();
    const quat = new Quaternion(transform.x, transform.y, transform.z, transform.w);
    forward.set(0, 0, -1).applyQuaternion(quat).normalize();
    right.set(1, 0, 0).applyQuaternion(quat).normalize();
    up.crossVectors(forward, right).normalize();

    const velocity = this.body.linvel();
    const vel = new Vector3(velocity.x, velocity.y, velocity.z);
    const speedForward = vel.dot(forward);
    const speedSide = vel.dot(right);
    const speed = Math.sqrt(speedForward * speedForward + speedSide * speedSide);

    const smoothRate = Math.min(1, dt * 6);
    this.smoothed.throttle += (this.controls.throttle - this.smoothed.throttle) * smoothRate;
    this.smoothed.brake += (this.controls.brake - this.smoothed.brake) * smoothRate;
    this.smoothed.handbrake += (this.controls.handbrake - this.smoothed.handbrake) * Math.min(1, dt * 10);

    const steerTarget = this.controls.steer * this.tuning.maxSteer;
    const steerRate = 8 + Math.abs(speedForward) * 0.05;
    this.steeringAngle += (steerTarget - this.steeringAngle) * Math.min(1, dt * steerRate);

    const weight = this.tuning.mass * 9.81;
    const engineForce = this.smoothed.throttle * this.tuning.enginePower;
    const brakeForce = this.smoothed.brake * this.tuning.brakeForce;
    const handbrakeForce = this.smoothed.handbrake * this.tuning.brakeForce * 0.6;

    const tireGripRear = this.smoothed.handbrake > 0.1 ? this.tuning.handbrakeGrip : this.tuning.tireGripRear;
    const tireGripFront = this.tuning.tireGripFront;

    const angularVelocity = this.body.angvel();
    const angVel = new Vector3(angularVelocity.x, angularVelocity.y, angularVelocity.z);
    const invQuat = quat.clone().invert();
    const localAngular = angVel.clone().applyQuaternion(invQuat);
    const yawRate = localAngular.y;

    const frontLateralSpeed = speedSide + yawRate * this.cgToFrontAxle;
    const rearLateralSpeed = speedSide - yawRate * this.cgToRearAxle;
    const minForward = Math.max(4, Math.abs(speedForward));
    const slipAngleFront = Math.atan2(frontLateralSpeed, minForward) - this.steeringAngle;
    const slipAngleRear = Math.atan2(rearLateralSpeed, minForward);

    const frontCornerStiffness = tireGripFront * weight * 0.5;
    const rearCornerStiffness = tireGripRear * weight * 0.5;
    const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

    let lateralForceFront = clamp(-frontCornerStiffness * slipAngleFront, frontCornerStiffness * 1.25);
    let lateralForceRear = clamp(-rearCornerStiffness * slipAngleRear, rearCornerStiffness * 1.25);

    const longitudinalDrag = speedForward * Math.abs(speedForward) * this.tuning.drag;
    const rollingResistance = speedForward * this.tuning.rollingResistance;
    let longitudinalForce = engineForce - Math.sign(speedForward) * (brakeForce + handbrakeForce) - longitudinalDrag - rollingResistance;
    if (Math.abs(speedForward) < 0.5 && this.smoothed.brake > 0.2) {
      longitudinalForce -= this.smoothed.brake * this.tuning.brakeForce * Math.sign(speedForward || 1);
    }

    const downforce = speed * speed * this.tuning.downforce;

    const totalForce = forward
      .clone()
      .multiplyScalar(longitudinalForce)
      .add(right.clone().multiplyScalar(lateralForceFront + lateralForceRear))
      .add(up.clone().multiplyScalar(-downforce));
    this.body.addForce({ x: totalForce.x, y: totalForce.y, z: totalForce.z }, true);

    const yawTorque = lateralForceFront * this.cgToFrontAxle - lateralForceRear * this.cgToRearAxle;
    const alignmentError = up.clone().cross(worldUp);
    const rollDamping = right.clone().multiplyScalar(-localAngular.z * this.tuning.mass * 2.1);
    const pitchDamping = forward.clone().multiplyScalar(-localAngular.x * this.tuning.mass * 1.6);
    const yawDamping = up.clone().multiplyScalar(-localAngular.y * this.tuning.mass * 0.6);
    const torque = up
      .clone()
      .multiplyScalar(yawTorque)
      .add(alignmentError.multiplyScalar(this.tuning.mass * 14))
      .add(rollDamping)
      .add(pitchDamping)
      .add(yawDamping);
    this.body.addTorque({ x: torque.x, y: torque.y, z: torque.z }, true);

    const maxSlip = Math.max(frontCornerStiffness, rearCornerStiffness);
    this.slip = Math.min(1.5, (Math.abs(lateralForceFront) + Math.abs(lateralForceRear)) / Math.max(1, maxSlip));
    this.rpm = 1200 + Math.abs(speedForward) * 95 + this.smoothed.throttle * 2000;

    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    if (horizontalSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / horizontalSpeed;
      this.body.setLinvel({ x: velocity.x * scale, y: velocity.y, z: velocity.z * scale }, true);
    }
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
