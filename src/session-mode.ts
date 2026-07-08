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
let pendingMode: PlaygroundMode | null = null;

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

function waitForSessionEnd(world: World): Promise<void> {
  const session = world.session;
  if (!session) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onEnd = () => {
      session.removeEventListener("end", onEnd);
      resolve();
    };
    session.addEventListener("end", onEnd);
    world.exitXR();
  });
}

async function launchWhenReady(
  world: World,
  mode: SessionMode,
  features: typeof AR_FEATURES | typeof VR_FEATURES,
  onEnter?: () => void,
): Promise<void> {
  if (world.session) {
    pendingMode = mode;
    await waitForSessionEnd(world);
  }

  currentMode = mode;
  pendingMode = null;

  const unsubscribe = world.visibilityState.subscribe((state) => {
    if (state === VisibilityState.Visible) {
      unsubscribe();
      onEnter?.();
    }
  });

  world.launchXR({ sessionMode: mode, features });
}

export function switchToVR(
  world: World,
  options?: { onEnter?: () => void },
): void {
  void launchWhenReady(
    world,
    SessionMode.ImmersiveVR,
    VR_FEATURES,
    options?.onEnter,
  ).catch((error) => {
    console.error("[Playground] Failed to enter VR:", error);
  });
}

export function switchToAR(
  world: World,
  options?: { onEnter?: () => void },
): void {
  void (async () => {
    if (navigator.xr) {
      const supported = await navigator.xr.isSessionSupported(
        SessionMode.ImmersiveAR,
      );
      if (!supported) {
        console.warn(
          "[Playground] immersive-ar is not supported on this device/browser. Use a Quest passthrough browser or an Android phone with WebXR AR.",
        );
        return;
      }
    }

    await launchWhenReady(
      world,
      SessionMode.ImmersiveAR,
      AR_FEATURES,
      options?.onEnter,
    );
  })().catch((error) => {
    console.error(
      "[Playground] Failed to enter AR. AR requires a headset or phone with passthrough/camera AR support.",
      error,
    );
  });
}

export function exitSession(world: World): void {
  if (world.visibilityState.value !== VisibilityState.NonImmersive) {
    world.exitXR();
  }
  currentMode = "browser";
}

export function syncPlaygroundModeFromWorld(world: World): void {
  if (world.visibilityState.value === VisibilityState.NonImmersive) {
    if (!pendingMode) {
      currentMode = "browser";
    }
  }
}

export function setVrFloorVisible(
  floorEntity: Entity | undefined,
  visible: boolean,
): void {
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
