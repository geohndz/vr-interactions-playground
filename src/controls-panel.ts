import {
  Color,
  Entity,
  PanelDocument,
  PanelUI,
  RayInteractable,
  ScreenSpace,
  SessionMode,
  UIKit,
  UIKitDocument,
  VisibilityState,
  XRAnchor,
  createSystem,
  eq,
} from "@iwsdk/core";

import {
  exitSession,
  getModeLabel,
  getPlaygroundMode,
  switchToAR,
  switchToVR,
  syncEnvironmentForMode,
} from "./session-mode.js";
import { resetSpherePosition } from "./sphere.js";
import { sphereInteractionState } from "./sphere-feedback.js";

const PANEL_CONFIG = "./ui/controls-panel.json";

export class ControlsPanelSystem extends createSystem({
  controlsPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", PANEL_CONFIG)],
  },
}) {
  private floorEntity?: Entity;
  private sphereEntity?: Entity;
  private panelEntity?: Entity;
  private modeStatus?: UIKit.Text;
  private interactionStatus?: UIKit.Text;

  configure(options: {
    floorEntity?: Entity;
    sphereEntity?: Entity;
  }): void {
    this.floorEntity = options.floorEntity;
    this.sphereEntity = options.sphereEntity;
  }

  init() {
    this.queries.controlsPanel.subscribe("qualify", (entity) => {
      this.panelEntity = entity;
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) return;

      this.modeStatus = document.getElementById("mode-status") as UIKit.Text;
      this.interactionStatus = document.getElementById(
        "interaction-status",
      ) as UIKit.Text;

      const enterVrButton = document.getElementById(
        "enter-vr-button",
      ) as UIKit.Text;
      const enterArButton = document.getElementById(
        "enter-ar-button",
      ) as UIKit.Text;
      const exitXrButton = document.getElementById(
        "exit-xr-button",
      ) as UIKit.Text;

      enterVrButton.addEventListener("click", () => {
        switchToVR(this.world, {
          onEnter: () => this.onSessionEntered(SessionMode.ImmersiveVR),
        });
      });

      enterArButton.addEventListener("click", () => {
        switchToAR(this.world, {
          onEnter: () => this.onSessionEntered(SessionMode.ImmersiveAR),
        });
      });

      exitXrButton.addEventListener("click", () => {
        exitSession(this.world);
        this.removePanelAnchor();
        syncEnvironmentForMode(this.world, this.floorEntity);
        this.updateStatusLabels();
      });

      this.world.visibilityState.subscribe(() => {
        syncEnvironmentForMode(this.world, this.floorEntity);
        this.updateStatusLabels();
      });
    });
  }

  update() {
    this.updateStatusLabels();
  }

  private onSessionEntered(mode: SessionMode): void {
    if (mode === SessionMode.ImmersiveAR) {
      if (this.sphereEntity) {
        resetSpherePosition(this.sphereEntity);
      }
      this.addPanelAnchor();
    } else {
      this.removePanelAnchor();
    }
    syncEnvironmentForMode(this.world, this.floorEntity);
    this.updateStatusLabels();
  }

  private addPanelAnchor(): void {
    if (!this.panelEntity || this.panelEntity.hasComponent(XRAnchor)) return;
    this.panelEntity.addComponent(XRAnchor);
  }

  private removePanelAnchor(): void {
    if (!this.panelEntity?.hasComponent(XRAnchor)) return;
    this.panelEntity.removeComponent(XRAnchor);
  }

  private updateStatusLabels(): void {
    if (!this.modeStatus || !this.interactionStatus) return;

    const immersive =
      this.world.visibilityState.value !== VisibilityState.NonImmersive;
    const modeLabel = immersive ? getModeLabel(getPlaygroundMode()) : "Browser";

    this.modeStatus.setProperties({ text: `Mode: ${modeLabel}` });
    this.interactionStatus.setProperties({
      text: `Sphere: ${sphereInteractionState.label}`,
    });
  }
}

export function createControlsPanel(world: import("@iwsdk/core").World): Entity {
  const panelEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: PANEL_CONFIG,
      maxHeight: 1.2,
      maxWidth: 0.55,
    })
    .addComponent(RayInteractable)
    .addComponent(ScreenSpace, {
      top: "16px",
      right: "16px",
      width: "360px",
      maxHeight: "90vh",
    });

  panelEntity.object3D!.position.set(0, 1.4, -1.2);
  return panelEntity;
}
