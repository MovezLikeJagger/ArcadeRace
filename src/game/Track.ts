import { CatmullRomCurve3, Vector3 } from 'three';

export type Checkpoint = {
  position: Vector3;
  normal: Vector3;
  radius: number;
};

export type TrackDefinition = {
  curve: CatmullRomCurve3;
  checkpoints: Checkpoint[];
  spawnPoint: Vector3;
  spawnHeading: number;
};

export function createOvalTrack(): TrackDefinition {
  const points: Vector3[] = [];
  const radiusX = 40;
  const radiusZ = 20;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.cos(angle) * radiusX;
    const z = Math.sin(angle) * radiusZ;
    const y = Math.sin(angle * 2) * 0.6; // subtle banking
    points.push(new Vector3(x, y, z));
  }
  points.push(points[0].clone());

  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.05);

  const checkpoints: Checkpoint[] = [];
  const checkpointCount = 6;
  for (let i = 0; i < checkpointCount; i++) {
    const t = i / checkpointCount;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new Vector3(0, 1, 0).cross(tangent).normalize();
    checkpoints.push({ position, normal, radius: 10 });
  }

  const spawnPoint = curve.getPointAt(0).clone().add(new Vector3(0, 0.5, 0));
  const spawnHeading = Math.atan2(
    curve.getTangentAt(0).x,
    curve.getTangentAt(0).z
  );

  return { curve, checkpoints, spawnPoint, spawnHeading };
}
