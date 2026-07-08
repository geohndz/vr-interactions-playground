import {
  Entity,
  FollowBehavior,
  Follower,
  PanelDocument,
  PanelUI,
  PokeInteractable,
  RayInteractable,
  ScreenSpace,
  SessionMode,
  UIKit,
  UIKitDocument,
  VisibilityState,
  createSystem,
  eq,
} from "@iwsdk/core";

import { playgroundRefs } from "./playground-context.js";
import {
  enterMXR,
  exitSession,
  syncEnvironmentForMode,
} from "./session-mode.js";
import { resetSpherePosition } from "./sphere.js";

const TOGGLE_CONFIG = "./ui/xr-toggle.json";

function configureIconButton(
  element: UIKit.Custom | UIKit.Text | null,
  id: string,
  onActivate: () => void,
): void {
  if (!element) return;

  element.name = id;
  element.setProperties({
    pointerEvents: "auto",
    pointerEventsOrder: 20,
  });
  element.addEventListener("click", onActivate);
}

export class XrToggleSystem extends createSystem({
  xrToggle: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", TOGGLE_CONFIG)],
  },
}) {
  private toggleEntity?: Entity;
  private enterButton?: UIKit.Text;
  private exitButton?: UIKit.Text;

  init() {
    this.queries.xrToggle.subscribe("qualify", (entity) => {
      this.toggleEntity = entity;
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) return;

      document.rootElement?.setProperties({ pointerEvents: "none" });

      this.enterButton = document.getElementById(
        "enter-mxr-button",
      ) as UIKit.Text;
      this.exitButton = document.getElementById(
        "exit-mxr-button",
      ) as UIKit.Text;

      configureIconButton(this.enterButton, "enter-mxr-button", () => {
        enterMXR(this.world, {
          onEnter: (mode) => this.onSessionEntered(mode),
        });
      });

      configureIconButton(this.exitButton, "exit-mxr-button", () => {
        exitSession(this.world);
        this.removeHeadFollow();
        syncEnvironmentForMode(this.world, playgroundRefs.floorEntity);
        this.updateToggleVisibility();
      });

      this.world.visibilityState.subscribe(() => {
        syncEnvironmentForMode(this.world, playgroundRefs.floorEntity);
        this.updateToggleVisibility();
        this.syncHeadFollow();
      });

      this.updateToggleVisibility();
    });
  }

  update() {
    this.syncHeadFollow();
  }

  private onSessionEntered(mode: SessionMode): void {
    if (mode === SessionMode.ImmersiveAR && playgroundRefs.sphereEntity) {
      resetSpherePosition(playgroundRefs.sphereEntity);
    }
    syncEnvironmentForMode(this.world, playgroundRefs.floorEntity);
    this.syncHeadFollow();
    this.updateToggleVisibility();
  }

  private syncHeadFollow(): void {
    if (!this.toggleEntity) return;

    const immersive =
      this.world.visibilityState.value !== VisibilityState.NonImmersive;

    if (immersive) {
      if (!this.toggleEntity.hasComponent(Follower)) {
        this.toggleEntity.addComponent(Follower, {
          target: this.player.head,
          offsetPosition: [0, 0.28, -0.42],
          behavior: FollowBehavior.NoRotation,
          speed: 12,
          tolerance: 0.01,
        });
      }
      return;
    }

    this.removeHeadFollow();
  }

  private removeHeadFollow(): void {
    if (this.toggleEntity?.hasComponent(Follower)) {
      this.toggleEntity.removeComponent(Follower);
    }
  }

  private updateToggleVisibility(): void {
    const immersive =
      this.world.visibilityState.value !== VisibilityState.NonImmersive;

    this.enterButton?.setProperties({
      display: immersive ? "none" : "flex",
    });
    this.exitButton?.setProperties({
      display: immersive ? "flex" : "none",
    });
  }
}

export function createXrToggle(world: import("@iwsdk/core").World): Entity {
  return world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: TOGGLE_CONFIG,
      maxHeight: 0.08,
      maxWidth: 0.08,
    })
    .addComponent(RayInteractable)
    .addComponent(PokeInteractable)
    .addComponent(ScreenSpace, {
      top: "12px",
      left: "calc(50vw - 28px)",
      width: "56px",
      height: "56px",
      zOffset: 0.25,
    });
}
