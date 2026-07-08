import {
  Color,
  Grabbed,
  Mesh,
  MeshStandardMaterial,
  createSystem,
} from "@iwsdk/core";

import { SphereLab } from "./sphere.js";

export const sphereInteractionState = { label: "idle" };

const baseEmissive = new Color(0x003366);
const grabbedEmissive = new Color(0xff4400);

const BASE_INTENSITY = 0.2;
const GRABBED_INTENSITY = 2.0;

export class SphereFeedbackSystem extends createSystem({
  spheres: { required: [SphereLab] },
}) {
  private readonly scratchColor = new Color();

  update(dt: number) {
    for (const entity of this.queries.spheres.entities) {
      const mesh = entity.object3D as Mesh | undefined;
      if (!mesh) continue;

      const material = mesh.material as MeshStandardMaterial;
      const isGrabbed = entity.hasComponent(Grabbed);

      const targetColor = isGrabbed ? grabbedEmissive : baseEmissive;
      const targetIntensity = isGrabbed ? GRABBED_INTENSITY : BASE_INTENSITY;
      sphereInteractionState.label = isGrabbed ? "grabbed" : "idle";

      const lerpFactor = Math.min(1, dt * 10);
      this.scratchColor.copy(targetColor);
      material.emissive.lerp(this.scratchColor, lerpFactor);
      material.emissiveIntensity +=
        (targetIntensity - material.emissiveIntensity) * lerpFactor;
    }
  }
}
