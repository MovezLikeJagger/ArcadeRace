import { Clock, Group, Scene, Vector3 } from 'three';
import { SceneFactory } from '../render/SceneFactory';
import { Renderer, CameraTarget } from '../render/Renderer';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { InputManager } from '../input/InputManager';
import { HUD } from '../ui/HUD';
import { AudioEngine } from '../audio/AudioEngine';
import { GhostRecorder } from './GhostRecorder';
import { LapTimer } from './LapTimer';
import { AIController } from './AIController';

export class Game {
  private readonly container: HTMLElement;
  private readonly physics = new PhysicsWorld();
  private readonly input = new InputManager();
  private readonly hud = new HUD();
  private readonly audio = new AudioEngine();
  private renderer!: Renderer;
  private scene!: Scene;
  private cameraTarget: CameraTarget = {
    position: new Vector3(),
    velocity: new Vector3(),
    forward: new Vector3(0, 0, -1),
  };
  private carMesh: Group | null = null;
  private ghost!: GhostRecorder;
  private lapTimer!: LapTimer;
  private ai!: AIController;
  private clock = new Clock();
  private playing = false;

  constructor(private readonly mountId = 'app') {
    const element = document.getElementById(this.mountId);
    if (!element) {
      throw new Error('Mount element not found');
    }
    this.container = element;
  }

  async start() {
    const { track } = await this.physics.init();
    const sceneFactory = new SceneFactory(track);
    const { scene, carPrefab } = sceneFactory.build();
    this.scene = scene;
    this.renderer = new Renderer(this.scene, this.container);

    this.carMesh = carPrefab.clone();
    this.carMesh.traverse((child) => {
      const mesh = child as any;
      if (mesh.material) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this.scene.add(this.carMesh);

    this.ghost = new GhostRecorder(this.scene, carPrefab);
    this.lapTimer = new LapTimer(track);
    this.ai = new AIController(this.scene, track, carPrefab);

    this.playing = true;
    this.clock.start();
    this.loop();
  }

  private loop = () => {
    if (!this.playing) return;
    requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    const input = this.input.update();

    if (input.reset) {
      const { lastCheckpointHeading, lastCheckpointPosition } = this.lapTimer.getState();
      this.physics.resetToCheckpoint(lastCheckpointPosition, lastCheckpointHeading);
    }

    if (input.toggleGhost) {
      this.ghost.toggle();
    }

    if (input.toggleAI) {
      this.ai.toggle();
    }

    if (input.toggleFPS) {
      this.hud.toggleFPS();
    }

    this.physics.step(dt, {
      throttle: input.throttle,
      brake: input.brake,
      steer: input.steer,
      handbrake: input.handbrake,
    });

    const transform = this.physics.getInterpolatedTransform();
    if (this.carMesh) {
      this.carMesh.position.copy(transform.position);
      this.carMesh.quaternion.copy(transform.rotation);
    }

    const car = this.physics.getCar();
    const telemetry = car.getTelemetry();

    this.lapTimer.update(dt, transform.position);

    this.cameraTarget.position.copy(transform.position).add(new Vector3(0, 1.0, 0));
    const linearVelocity = car.getRigidBody().linvel();
    this.cameraTarget.velocity.set(linearVelocity.x, linearVelocity.y, linearVelocity.z);
    const forwardVec = new Vector3(0, 0, -1).applyQuaternion(transform.rotation);
    this.cameraTarget.forward.copy(forwardVec);
    this.renderer.update(this.cameraTarget, dt, telemetry.speed, telemetry.slip);
    if (telemetry.slip > 0.25) {
      this.renderer.applyImpulse(Math.min((telemetry.slip - 0.25) * 0.2, 0.2));
    }

    this.audio.update(telemetry);

    this.ghost.update(dt, transform.position, transform.rotation);
    this.ai.update(dt);

    const lapState = this.lapTimer.getState();
    this.hud.updateTelemetry(telemetry);
    this.hud.updateGhost(this.ghost.getState());
    this.hud.updateAI({ enabled: this.ai.isEnabled() });
    this.hud.updateLapInfo({
      currentLapTime: lapState.currentLapTime,
      bestLapTime: lapState.bestLapTime,
      lapCount: lapState.lapCount,
      checkpoint: lapState.checkpointIndex,
    });
    this.hud.updateFPS(dt);
  };
}
