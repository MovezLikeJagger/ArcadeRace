import {
  ACESFilmicToneMapping,
  Clock,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';

export type CameraTarget = {
  position: Vector3;
  velocity: Vector3;
  forward: Vector3;
};

export class Renderer {
  private readonly renderer: WebGLRenderer;
  private readonly camera: PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: UnrealBloomPass;
  private readonly afterImagePass: AfterimagePass;
  private readonly chasePosition = new Vector3();
  private readonly chaseVelocity = new Vector3();
  private readonly currentForward = new Vector3(0, 0, 1);
  private readonly shakeOffset = new Vector3();
  private readonly lastShake = new Vector3();
  private readonly tmp = new Vector3();
  private readonly clock = new Clock();
  private baseFov = 60;
  private shakeIntensity = 0;

  constructor(private readonly scene: Scene, private readonly container: HTMLElement) {
    this.camera = new PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 5, 10);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.1);
    this.afterImagePass = new AfterimagePass(0.85);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.afterImagePass);

    window.addEventListener('resize', () => this.onResize());
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  update(target: CameraTarget, dt: number, speed: number, slip: number) {
    const desiredPosition = this.computeDesiredPosition(target, speed);
    this.chasePosition.lerp(desiredPosition, 1 - Math.exp(-dt * 4));

    const springStrength = 80;
    const damping = 12;
    const offset = this.tmp.copy(this.chasePosition).sub(this.camera.position).multiplyScalar(springStrength * dt);
    this.chaseVelocity.add(offset).multiplyScalar(Math.max(0, 1 - damping * dt));
    this.camera.position.add(this.chaseVelocity.clone().multiplyScalar(dt));

    this.camera.lookAt(target.position.clone().add(new Vector3(0, 1.2, 0)));

    this.currentForward.lerp(target.forward, 1 - Math.exp(-dt * 3));
    const fovKick = Math.min(speed / 60, 1) * 10;
    const slipKick = Math.min(Math.abs(slip) * 8, 8);
    this.camera.fov = this.baseFov + fovKick + slipKick;
    this.camera.updateProjectionMatrix();

    this.updateShake(dt, slip);

    this.composer.render();
  }

  renderFrame() {
    this.composer.render();
  }

  tick() {
    return this.clock.getDelta();
  }

  applyImpulse(intensity: number) {
    this.shakeIntensity = Math.min(1, this.shakeIntensity + intensity);
  }

  private updateShake(dt: number, slip: number) {
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.5 + Math.abs(slip) * 0.02);
    const shake = this.shakeIntensity * 0.5;
    this.camera.position.sub(this.lastShake);
    this.shakeOffset.set(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake * 0.6,
      (Math.random() - 0.5) * shake
    );
    this.camera.position.add(this.shakeOffset);
    this.lastShake.copy(this.shakeOffset);
  }

  private computeDesiredPosition(target: CameraTarget, speed: number) {
    const backOffset = 6 + Math.min(speed * 0.05, 4);
    const heightOffset = 3.2 + Math.min(speed * 0.02, 1.5);
    const desired = this.tmp
      .copy(target.forward)
      .multiplyScalar(-backOffset)
      .add(target.position)
      .add(new Vector3(0, heightOffset, 0));
    return desired;
  }

  private onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
}
