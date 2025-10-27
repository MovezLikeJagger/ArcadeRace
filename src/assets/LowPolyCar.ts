import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector2 } from 'three';
import { createCarTexture } from './textures';

export type CarDimensions = {
  length: number;
  width: number;
  height: number;
};

export function createLowPolyCar(color = '#ff1744'): Group {
  const car = new Group();
  const bodyMaterial = new MeshStandardMaterial({
    map: createCarTexture(color),
    roughness: 0.6,
    metalness: 0.1,
  });
  const bodyGeometry = new BoxGeometry(1.8, 0.4, 0.9);
  bodyGeometry.translate(0, 0.3, 0);
  const body = new Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  car.add(body);

  const cabinGeometry = new BoxGeometry(0.9, 0.4, 0.8);
  cabinGeometry.translate(-0.1, 0.7, 0);
  const cabinMaterial = new MeshStandardMaterial({ color: '#d8e9ff', roughness: 0.2 });
  const cabin = new Mesh(cabinGeometry, cabinMaterial);
  car.add(cabin);

  const wheelGeometry = new BoxGeometry(0.25, 0.25, 0.25);
  wheelGeometry.scale(1.2, 0.6, 1.4);
  const wheelMaterial = new MeshStandardMaterial({ color: '#111111' });
  const wheelPositions = [
    new Vector2(0.7, 0.35),
    new Vector2(-0.6, 0.35),
    new Vector2(0.7, -0.35),
    new Vector2(-0.6, -0.35),
  ];
  wheelPositions.forEach((pos) => {
    const wheel = new Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, 0.12, pos.y);
    wheel.castShadow = true;
    car.add(wheel);
  });

  car.userData.dimensions = { length: 1.8, width: 0.9, height: 0.8 } satisfies CarDimensions;

  return car;
}
