import { Group, Quaternion, Scene, Vector3 } from 'three';

export type GhostFrame = {
  time: number;
  position: Vector3;
  rotation: Quaternion;
};

export class GhostRecorder {
  private frames: GhostFrame[] = [];
  private replayIndex = 0;
  private elapsed = 0;
  private recording = false;
  private active = false;
  private ghost: Group | null = null;

  constructor(private readonly scene: Scene, private readonly ghostPrefab: Group) {}

  toggle() {
    if (!this.active) {
      this.startRecording();
    } else if (this.recording) {
      this.startReplay();
    } else {
      this.stop();
    }
  }

  update(dt: number, position: Vector3, rotation: Quaternion) {
    if (!this.active) return;
    this.elapsed += dt;
    if (this.recording) {
      this.frames.push({ time: this.elapsed, position: position.clone(), rotation: rotation.clone() });
      if (this.ghost) {
        this.ghost.position.copy(position);
        this.ghost.quaternion.copy(rotation);
      }
    } else {
      this.advanceReplay(dt);
    }
  }

  getState() {
    return { active: this.active, recording: this.recording };
  }

  private startRecording() {
    this.frames = [];
    this.elapsed = 0;
    this.recording = true;
    this.active = true;
    this.attachGhost('#ffffff');
    if (this.ghost) {
      this.ghost.visible = false;
    }
  }

  private startReplay() {
    if (this.frames.length === 0) {
      this.stop();
      return;
    }
    this.recording = false;
    this.replayIndex = 0;
    this.elapsed = 0;
    this.attachGhost('#03dac6');
    const first = this.frames[0];
    if (this.ghost && first) {
      this.ghost.position.copy(first.position);
      this.ghost.quaternion.copy(first.rotation);
      this.ghost.visible = true;
    }
  }

  private stop() {
    this.detachGhost();
    this.active = false;
    this.recording = false;
    this.frames = [];
  }

  private advanceReplay(dt: number) {
    if (!this.ghost || this.frames.length === 0) return;
    const time = this.elapsed;
    while (this.replayIndex < this.frames.length - 1 && this.frames[this.replayIndex + 1].time < time) {
      this.replayIndex++;
    }
    const current = this.frames[this.replayIndex];
    const next = this.frames[Math.min(this.replayIndex + 1, this.frames.length - 1)];
    const alpha = current === next ? 0 : (time - current.time) / Math.max(1e-5, next.time - current.time);
    this.ghost.position.copy(current.position).lerp(next.position, alpha);
    this.ghost.quaternion.copy(current.rotation).slerp(next.rotation, alpha);
    if (time > this.frames[this.frames.length - 1].time) {
      this.elapsed = 0;
      this.replayIndex = 0;
    }
  }

  private attachGhost(color: string) {
    this.detachGhost();
    this.ghost = this.ghostPrefab.clone();
    this.ghost.traverse((child) => {
      const mesh = child as any;
      if (mesh.material) {
        mesh.material = mesh.material.clone();
        mesh.material.color?.set(color);
        mesh.material.transparent = true;
        mesh.material.opacity = 0.5;
      }
    });
    this.scene.add(this.ghost);
  }

  private detachGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
  }
}
