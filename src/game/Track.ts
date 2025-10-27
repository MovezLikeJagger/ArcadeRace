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
  width: number;
};

export function createOvalTrack(): TrackDefinition {
  const controlPoints = [
    new Vector3(-52, 0, -10),
    new Vector3(-30, 0, -40),
    new Vector3(0, 0, -48),
    new Vector3(32, 0, -36),
    new Vector3(56, 0, -8),
    new Vector3(44, 0, 26),
    new Vector3(12, 0, 44),
    new Vector3(-26, 0, 40),
    new Vector3(-54, 0, 12),
  ];
  const points: Vector3[] = [];
  const smoothing = 0.35;
  const subdivisions = 2;
  for (let i = 0; i < controlPoints.length; i++) {
    const current = controlPoints[i];
    const next = controlPoints[(i + 1) % controlPoints.length];
    points.push(current.clone());
    for (let s = 1; s <= subdivisions; s++) {
      const lerp = current.clone().lerp(next, s / (subdivisions + 1));
      lerp.y = Math.sin((i + s / (subdivisions + 1)) * 0.7) * 0.5;
      points.push(lerp);
    }
  }
  points.push(points[0].clone());

  const curve = new CatmullRomCurve3(points, true, 'catmullrom', smoothing);

  const checkpoints: Checkpoint[] = [];
  const checkpointCount = 8;
  for (let i = 0; i < checkpointCount; i++) {
    const t = i / checkpointCount;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new Vector3(0, 1, 0).cross(tangent).normalize();
    checkpoints.push({ position, normal, radius: 10 });
  }

  const spawnPoint = curve.getPointAt(0).clone().add(new Vector3(0, 0.6, 0));
  const spawnHeading = Math.atan2(curve.getTangentAt(0).x, curve.getTangentAt(0).z);

  return { curve, checkpoints, spawnPoint, spawnHeading, width: 14 };
}
