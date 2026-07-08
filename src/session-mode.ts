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
  anchors: false,
  hitTest: false,
  planeDetection: false,
  meshDetection: false,
} as const;

let currentMode: PlaygroundMode = "browser";
let pendingMode: PlaygroundMode | null = null;
let launchGeneration = 0;

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

async function ensureSessionClear(world: World): Promise<void> {
  if (world.session) {
    await waitForSessionEnd(world);
  }

  await new Promise<void>((resolve) => {
    let frames = 0;
    const wait = () => {
      frames += 1;
      const presenting = world.renderer.xr.isPresenting;
      const hasSession = Boolean(world.session);

      if (!presenting && !hasSession && frames > 2) {
        resolve();
        return;
      }

      if (frames > 180) {
        console.warn(
          "[Playground] Timed out waiting for XR teardown; attempting relaunch anyway.",
        );
        resolve();
        return;
      }

      requestAnimationFrame(wait);
    };
    wait();
  });
}

function updateXrDefaults(
  world: World,
  mode: SessionMode,
  features: typeof AR_FEATURES | typeof VR_FEATURES,
): void {
  world.xrDefaults = {
    sessionMode: mode,
    features: { ...features },
    restoreCameraOnExit: true,
  };
}

function isLocalDevHost(): boolean {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function resolveMXRMode(): Promise<SessionMode | null> {
  if (!navigator.xr) {
    return null;
  }

  const vrSupported = await navigator.xr.isSessionSupported(
    SessionMode.ImmersiveVR,
  );
  const arSupported = await navigator.xr.isSessionSupported(
    SessionMode.ImmersiveAR,
  );

  // IWER on localhost emulates VR; AR requests fail with "No XR hardware found".
  if (isLocalDevHost() && vrSupported) {
    return SessionMode.ImmersiveVR;
  }

  if (arSupported) {
    return SessionMode.ImmersiveAR;
  }

  if (vrSupported) {
    return SessionMode.ImmersiveVR;
  }

  return null;
}

async function launchWhenReady(
  world: World,
  mode: SessionMode,
  features: typeof AR_FEATURES | typeof VR_FEATURES,
  onEnter?: () => void,
): Promise<void> {
  const generation = ++launchGeneration;

  await ensureSessionClear(world);

  if (generation !== launchGeneration) {
    return;
  }

  currentMode = mode;
  pendingMode = null;
  updateXrDefaults(world, mode, features);

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (result: "resolve" | "reject", error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      unsubscribe();
      if (result === "resolve") {
        onEnter?.();
        resolve();
      } else {
        reject(error ?? new Error("XR launch failed"));
      }
    };

    const timeoutId = window.setTimeout(() => {
      finish("reject", new Error("XR session did not become visible"));
    }, 15000);

    const unsubscribe = world.visibilityState.subscribe((state) => {
      if (generation !== launchGeneration) {
        finish("reject", new Error("XR launch cancelled"));
        return;
      }

      if (state === VisibilityState.Visible) {
        finish("resolve");
      }
    });

    try {
      const launchResult = world.launchXR({ sessionMode: mode, features });
      Promise.resolve(launchResult).catch((error: unknown) => {
        finish(
          "reject",
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    } catch (error) {
      finish(
        "reject",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  });
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

export function enterMXR(
  world: World,
  options?: { onEnter?: (mode: SessionMode) => void },
): void {
  void (async () => {
    const mode = await resolveMXRMode();
    if (!mode) {
      console.warn(
        "[Playground] WebXR is not available on this browser or device.",
      );
      return;
    }

    const features = mode === SessionMode.ImmersiveAR ? AR_FEATURES : VR_FEATURES;
    await launchWhenReady(world, mode, features, () => options?.onEnter?.(mode));
  })().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown XR launch error";

    if (message.includes("No XR hardware found")) {
      console.warn(
        "[Playground] No XR hardware detected. On desktop, use localhost with IWER enabled.",
      );
      return;
    }

    console.warn("[Playground] Failed to enter XR:", message);
  });
}

export function exitSession(world: World): void {
  launchGeneration += 1;
  pendingMode = null;
  currentMode = "browser";

  if (world.session) {
    world.exitXR();
  }
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
