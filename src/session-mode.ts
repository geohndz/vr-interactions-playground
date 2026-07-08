import {
  Entity,
  SessionMode,
  VisibilityState,
  World,
} from "@iwsdk/core";

export type PlaygroundMode =
  | "browser"
  | SessionMode.ImmersiveVR
  | SessionMode.ImmersiveAR;

const AR_FEATURES = {
  handTracking: true,
  anchors: true,
  hitTest: true,
  planeDetection: true,
  meshDetection: true,
  layers: true,
} as const;

const VR_FEATURES = {
  handTracking: true,
  layers: true,
} as const;

let currentMode: PlaygroundMode = "browser";

export function getPlaygroundMode(): PlaygroundMode {
  return currentMode;
}

export function getModeLabel(mode: PlaygroundMode = currentMode): string {
  switch (mode) {
    case SessionMode.ImmersiveVR:
      return "VR";
    case SessionMode.ImmersiveAR:
      return "AR";
    default:
      return "Browser";
  }
}

function launchWhenReady(
  world: World,
  mode: SessionMode,
  features: typeof AR_FEATURES | typeof VR_FEATURES,
  onEnter?: () => void,
): void {
  const launch = () => {
    currentMode = mode;
    world.launchXR({ sessionMode: mode, features });
    onEnter?.();
  };

  if (world.visibilityState.value === VisibilityState.NonImmersive) {
    launch();
    return;
  }

  const unsubscribe = world.visibilityState.subscribe((state) => {
    if (state === VisibilityState.NonImmersive) {
      unsubscribe();
      launch();
    }
  });
  world.exitXR();
}

export function switchToVR(
  world: World,
  options?: { onEnter?: () => void },
): void {
  launchWhenReady(
    world,
    SessionMode.ImmersiveVR,
    VR_FEATURES,
    options?.onEnter,
  );
}

export function switchToAR(
  world: World,
  options?: { onEnter?: () => void },
): void {
  launchWhenReady(
    world,
    SessionMode.ImmersiveAR,
    AR_FEATURES,
    options?.onEnter,
  );
}

export function exitSession(world: World): void {
  if (world.visibilityState.value !== VisibilityState.NonImmersive) {
    world.exitXR();
  }
  currentMode = "browser";
}

export function syncPlaygroundModeFromWorld(world: World): void {
  if (world.visibilityState.value === VisibilityState.NonImmersive) {
    currentMode = "browser";
  }
}

export function setVrFloorVisible(floorEntity: Entity | undefined, visible: boolean): void {
  if (floorEntity?.object3D) {
    floorEntity.object3D.visible = visible;
  }
}

export function syncEnvironmentForMode(
  world: World,
  floorEntity: Entity | undefined,
): void {
  const mode = currentMode;
  const inXR = world.visibilityState.value !== VisibilityState.NonImmersive;
  setVrFloorVisible(floorEntity, inXR && mode === SessionMode.ImmersiveVR);
}
