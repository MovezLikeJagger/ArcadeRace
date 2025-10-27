import { Group, Scene, Vector3 } from 'three';
import { TrackDefinition } from './Track';

export type AIActor = {
  mesh: Group;
  progress: number;
  speed: number;
};

export class AIController {
  private readonly actors: AIActor[] = [];
  private enabled = false;

  constructor(private readonly scene: Scene, private readonly track: TrackDefinition, private readonly carPrefab: Group) {}

  toggle() {
    this.setEnabled(!this.enabled);
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (this.enabled) {
      this.spawnActors();
    } else {
      this.disposeActors();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  update(dt: number) {
    if (!this.enabled) return;
    for (const actor of this.actors) {
      actor.progress = (actor.progress + dt * actor.speed) % 1;
      const position = this.track.curve.getPointAt(actor.progress);
      const tangent = this.track.curve.getTangentAt(actor.progress).normalize();
      actor.mesh.position.copy(position).add(new Vector3(0, 0.4, 0));
      const lookAt = position.clone().add(tangent);
      actor.mesh.lookAt(lookAt);
      const bankAmount = tangent.x * 0.1;
      actor.mesh.rotateZ(bankAmount);
    }
  }

  private spawnActors() {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const mesh = this.carPrefab.clone();
      mesh.traverse((child) => {
        const ch = child as any;
        if (ch.material) {
          ch.material = ch.material.clone();
          ch.material.color?.offsetHSL((i * 0.2) % 1, 0, 0);
        }
      });
      this.scene.add(mesh);
      this.actors.push({ mesh, progress: (i / count) % 1, speed: 0.05 + i * 0.01 });
    }
  }

  private disposeActors() {
    for (const actor of this.actors) {
      this.scene.remove(actor.mesh);
    }
    this.actors.length = 0;
  }
}
