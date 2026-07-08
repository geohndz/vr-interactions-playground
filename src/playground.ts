import {
  AmbientLight,
  DirectionalLight,
  Entity,
  EnvironmentType,
  LocomotionEnvironment,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  VisibilityState,
  World,
} from "@iwsdk/core";

import { playgroundRefs } from "./playground-context.js";
import {
  SphereFeedbackSystem,
} from "./sphere-feedback.js";
import { SphereLab, createSphereLab } from "./sphere.js";
import {
  syncEnvironmentForMode,
  syncPlaygroundModeFromWorld,
} from "./session-mode.js";
import { XrToggleSystem, createXrToggle } from "./xr-toggle.js";

export function createVrFloor(world: World): Entity {
  const floor = new Mesh(
    new PlaneGeometry(12, 12),
    new MeshStandardMaterial({
      color: 0x2a2a3a,
      transparent: true,
      opacity: 0.35,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.visible = false;

  return world
    .createTransformEntity(floor)
    .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
}

export function bootstrapPlayground(world: World): void {
  const ambient = new AmbientLight(0xffffff, 0.6);
  const keyLight = new DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2, 4, 3);
  world.scene.add(ambient, keyLight);

  const floorEntity = createVrFloor(world);
  const sphereEntity = createSphereLab(world);
  createXrToggle(world);

  playgroundRefs.floorEntity = floorEntity;
  playgroundRefs.sphereEntity = sphereEntity;

  world.registerComponent(SphereLab);
  world
    .registerSystem(SphereFeedbackSystem)
    .registerSystem(XrToggleSystem);

  world.visibilityState.subscribe((state) => {
    syncPlaygroundModeFromWorld(world);
    if (state === VisibilityState.NonImmersive && !world.session) {
      syncEnvironmentForMode(world, playgroundRefs.floorEntity);
    }
  });

  world.camera.position.set(0, 1.6, 0.5);
}
