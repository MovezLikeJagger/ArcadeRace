import { Vector3 } from 'three';
import { TrackDefinition } from './Track';

export type LapState = {
  currentLapTime: number;
  bestLapTime: number | null;
  lapCount: number;
  checkpointIndex: number;
  lastCheckpointPosition: Vector3;
  lastCheckpointHeading: number;
};

export class LapTimer {
  private currentLapTime = 0;
  private bestLapTime: number | null = null;
  private lapCount = 1;
  private checkpointIndex = 0;
  private lastCheckpointPosition: Vector3;
  private lastCheckpointHeading: number;

  constructor(private readonly track: TrackDefinition) {
    this.lastCheckpointPosition = track.spawnPoint.clone();
    this.lastCheckpointHeading = track.spawnHeading;
  }

  update(dt: number, position: Vector3) {
    this.currentLapTime += dt;
    const checkpoint = this.track.checkpoints[this.checkpointIndex];
    if (!checkpoint) return;
    const distance = position.distanceTo(checkpoint.position);
    if (distance <= checkpoint.radius) {
      this.lastCheckpointPosition = checkpoint.position.clone().add(new Vector3(0, 0.5, 0));
      const tangent = this.track.curve.getTangentAt(this.checkpointIndex / this.track.checkpoints.length);
      this.lastCheckpointHeading = Math.atan2(tangent.x, tangent.z);
      this.advanceCheckpoint();
    }
  }

  reset() {
    this.currentLapTime = 0;
    this.checkpointIndex = 0;
    this.lapCount = 1;
    this.lastCheckpointPosition = this.track.spawnPoint.clone();
    this.lastCheckpointHeading = this.track.spawnHeading;
  }

  getState(): LapState {
    return {
      currentLapTime: this.currentLapTime,
      bestLapTime: this.bestLapTime,
      lapCount: this.lapCount,
      checkpointIndex: this.checkpointIndex,
      lastCheckpointPosition: this.lastCheckpointPosition.clone(),
      lastCheckpointHeading: this.lastCheckpointHeading,
    };
  }

  private advanceCheckpoint() {
    this.checkpointIndex++;
    if (this.checkpointIndex >= this.track.checkpoints.length) {
      this.completeLap();
      this.checkpointIndex = 0;
    }
  }

  private completeLap() {
    if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
      this.bestLapTime = this.currentLapTime;
    }
    this.lapCount++;
    this.currentLapTime = 0;
  }
}
