import {
  AmbientLight,
  DirectionalLight,
  Entity,
  EnvironmentType,
  LocomotionEnvironment,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  World,
} from "@iwsdk/core";

import {
  ControlsPanelSystem,
  createControlsPanel,
} from "./controls-panel.js";
import {
  SphereFeedbackSystem,
} from "./sphere-feedback.js";
import { SphereLab, createSphereLab } from "./sphere.js";
import { playgroundRefs } from "./playground-context.js";
import { syncPlaygroundModeFromWorld } from "./session-mode.js";

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
  const panelEntity = createControlsPanel(world);

  playgroundRefs.floorEntity = floorEntity;
  playgroundRefs.sphereEntity = sphereEntity;

  world.registerComponent(SphereLab);
  world
    .registerSystem(SphereFeedbackSystem)
    .registerSystem(ControlsPanelSystem);

  world.visibilityState.subscribe(() => {
    syncPlaygroundModeFromWorld(world);
  });

  world.camera.position.set(0, 1.6, 0.5);

  // Default to non-immersive browser view; panel is screen-space until XR starts.
  panelEntity.object3D!.visible = true;
}
