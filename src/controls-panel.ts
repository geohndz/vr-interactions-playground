import {
  Entity,
  PanelDocument,
  PanelUI,
  PokeInteractable,
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

function disablePointerEvents(element: UIKit.Custom | UIKit.Text | null): void {
  element?.setProperties({ pointerEvents: "none" });
}

function configureButton(
  element: UIKit.Custom | UIKit.Text | null,
  id: string,
  onActivate: () => void,
): void {
  if (!element) return;

  element.name = id;
  element.setProperties({
    pointerEvents: "auto",
    pointerEventsOrder: 10,
  });

  const activate = () => onActivate();
  element.addEventListener("click", activate);
  element.addEventListener("pointerup", activate);
}

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

      disablePointerEvents(document.rootElement);
      for (const className of [
        "heading",
        "section-title",
        "body-text",
        "status-text",
      ]) {
        for (const element of document.getElementsByClassName(className)) {
          disablePointerEvents(element as UIKit.Text);
        }
      }

      this.modeStatus = document.getElementById("mode-status") as UIKit.Text;
      this.interactionStatus = document.getElementById(
        "interaction-status",
      ) as UIKit.Text;
      disablePointerEvents(this.modeStatus);
      disablePointerEvents(this.interactionStatus);

      configureButton(
        document.getElementById("enter-vr-button") as UIKit.Text,
        "enter-vr-button",
        () => {
          switchToVR(this.world, {
            onEnter: () => this.onSessionEntered(SessionMode.ImmersiveVR),
          });
        },
      );

      configureButton(
        document.getElementById("enter-ar-button") as UIKit.Text,
        "enter-ar-button",
        () => {
          switchToAR(this.world, {
            onEnter: () => this.onSessionEntered(SessionMode.ImmersiveAR),
          });
        },
      );

      configureButton(
        document.getElementById("exit-xr-button") as UIKit.Text,
        "exit-xr-button",
        () => {
          exitSession(this.world);
          this.removePanelAnchor();
          syncEnvironmentForMode(this.world, this.floorEntity);
          this.updateStatusLabels();
        },
      );

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
    .addComponent(PokeInteractable)
    .addComponent(ScreenSpace, {
      top: "16px",
      right: "16px",
      width: "360px",
      maxHeight: "90vh",
    });

  panelEntity.object3D!.position.set(-0.55, 1.4, -1.1);
  return panelEntity;
}
