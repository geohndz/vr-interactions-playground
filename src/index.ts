import { SessionMode, World } from "@iwsdk/core";

import { bootstrapPlayground } from "./playground.js";

World.create(document.getElementById("scene-container") as HTMLDivElement, {
  xr: {
    sessionMode: SessionMode.ImmersiveAR,
    offer: "none",
    features: {
      handTracking: true,
      anchors: true,
      hitTest: true,
      planeDetection: true,
      meshDetection: true,
      layers: true,
    },
  },
  input: {
    canvasPointerEvents: true,
  },
  features: {
    locomotion: {
      useWorker: true,
    },
    grabbing: {
      useHandPinchForGrab: true,
    },
    physics: false,
    sceneUnderstanding: true,
    environmentRaycast: true,
  },
}).then((world) => {
  bootstrapPlayground(world);
});
