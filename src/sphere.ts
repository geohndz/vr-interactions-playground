import {
  Entity,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TwoHandsGrabbable,
  World,
  createComponent,
} from "@iwsdk/core";

export const SphereLab = createComponent("SphereLab", {});

const SPHERE_RADIUS = 0.15;

export function createSphereLab(world: World): Entity {
  const material = new MeshStandardMaterial({
    color: 0x2266cc,
    emissive: 0x003366,
    emissiveIntensity: 0.2,
    metalness: 0.1,
    roughness: 0.4,
  });

  const sphere = new Mesh(new SphereGeometry(SPHERE_RADIUS), material);
  sphere.position.set(0, 1.3, -0.8);

  // IWSDK allows only one grab handle per entity. TwoHandsGrabbable supports
  // one-hand move/rotate and two-hand scale when both hands pinch the sphere.
  const entity = world.createTransformEntity(sphere).addComponent(SphereLab).addComponent(
    TwoHandsGrabbable,
    {
      translate: true,
      rotate: true,
      scale: true,
      scaleMin: [0.5, 0.5, 0.5],
      scaleMax: [2.5, 2.5, 2.5],
    },
  );

  return entity;
}

export function resetSpherePosition(entity: Entity): void {
  entity.object3D?.position.set(0, 1.3, -0.8);
  entity.object3D?.scale.setScalar(1);
}
