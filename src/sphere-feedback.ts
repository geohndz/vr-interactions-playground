import {
  Color,
  Grabbed,
  Hovered,
  Mesh,
  MeshStandardMaterial,
  Pressed,
  createSystem,
} from "@iwsdk/core";

import { SphereLab } from "./sphere.js";

export const sphereInteractionState = { label: "idle" };

const baseEmissive = new Color(0x003366);
const hoverEmissive = new Color(0x00aacc);
const pressedEmissive = new Color(0xff8800);
const grabbedEmissive = new Color(0xff4400);

const BASE_INTENSITY = 0.2;
const HOVER_INTENSITY = 0.8;
const PRESSED_INTENSITY = 1.4;
const GRABBED_INTENSITY = 2.0;

const BASE_SCALE = 1;
const GRABBED_SCALE = 1.08;

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
      const isPressed = entity.hasComponent(Pressed);
      const isHovered = entity.hasComponent(Hovered);

      let targetColor = baseEmissive;
      let targetIntensity = BASE_INTENSITY;
      let targetScale = BASE_SCALE;
      let label = "idle";

      if (isGrabbed) {
        targetColor = grabbedEmissive;
        targetIntensity = GRABBED_INTENSITY;
        targetScale = GRABBED_SCALE;
        label = "grabbed";
      } else if (isPressed) {
        targetColor = pressedEmissive;
        targetIntensity = PRESSED_INTENSITY;
        label = "pressed";
      } else if (isHovered) {
        targetColor = hoverEmissive;
        targetIntensity = HOVER_INTENSITY;
        label = "hovered";
      }

      sphereInteractionState.label = label;

      const lerpFactor = Math.min(1, dt * 10);
      this.scratchColor.copy(targetColor);
      material.emissive.lerp(this.scratchColor, lerpFactor);
      material.emissiveIntensity +=
        (targetIntensity - material.emissiveIntensity) * lerpFactor;

      const currentScale = mesh.scale.x;
      const nextScale = currentScale + (targetScale - currentScale) * lerpFactor;
      mesh.scale.setScalar(nextScale);
    }
  }
}
