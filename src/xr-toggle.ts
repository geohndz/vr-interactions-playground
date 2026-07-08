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
  World,
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

const GLOBE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;

const GLOBE_OFF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.114 4.462A14.5 14.5 0 0 1 12 2a10 10 0 0 1 9.313 13.643"/><path d="M15.557 15.556A14.5 14.5 0 0 1 12 22 10 10 0 0 1 4.929 4.929"/><path d="M15.892 10.234A14.5 14.5 0 0 0 12 2a10 10 0 0 0-3.643.687"/><path d="M17.656 12H22"/><path d="M19.071 19.071A10 10 0 0 1 12 22 14.5 14.5 0 0 1 8.44 8.45"/><path d="M2 12h10"/><path d="m2 2 20 20"/></svg>`;

const TOGGLE_MARKUP = `
  <span class="xr-toggle-track">
    <span class="xr-toggle-thumb">
      <span class="xr-toggle-icon"></span>
    </span>
  </span>
`;

function isLocalDevHost(): boolean {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

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

function createDomToggle(world: World): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = "xr-toggle";
  button.type = "button";
  button.role = "switch";
  button.setAttribute("aria-label", "Enter XR");
  button.setAttribute("aria-checked", "false");
  button.dataset.state = "browser";
  button.innerHTML = TOGGLE_MARKUP;

  button.addEventListener("click", () => {
    const immersive =
      world.visibilityState.value !== VisibilityState.NonImmersive;

    if (immersive) {
      exitSession(world);
      syncEnvironmentForMode(world, playgroundRefs.floorEntity);
      return;
    }

    enterMXR(world, {
      onEnter: (mode) => onSessionEntered(world, mode),
    });
  });

  document.body.appendChild(button);
  return button;
}

function onSessionEntered(world: World, mode: SessionMode): void {
  if (mode === SessionMode.ImmersiveAR && playgroundRefs.sphereEntity) {
    resetSpherePosition(playgroundRefs.sphereEntity);
  }
  syncEnvironmentForMode(world, playgroundRefs.floorEntity);
}

function updateDomToggle(
  world: World,
  button: HTMLButtonElement,
): void {
  const immersive =
    world.visibilityState.value !== VisibilityState.NonImmersive;
  const icon = button.querySelector(".xr-toggle-icon");

  if (icon) {
    icon.innerHTML = immersive ? GLOBE_OFF_ICON : GLOBE_ICON;
  }

  button.dataset.state = immersive ? "immersive" : "browser";
  button.setAttribute("aria-checked", immersive ? "true" : "false");
  button.setAttribute("aria-label", immersive ? "Exit XR" : "Enter XR");
}

export class XrToggleSystem extends createSystem({
  xrToggle: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", TOGGLE_CONFIG)],
  },
}) {
  private toggleEntity?: Entity;
  private exitButton?: UIKit.Text;
  private domToggle?: HTMLButtonElement;

  init() {
    this.domToggle = createDomToggle(this.world);

    this.queries.xrToggle.subscribe("qualify", (entity) => {
      this.toggleEntity = entity;
      const document = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!document) return;

      document.rootElement?.setProperties({ pointerEvents: "none" });

      this.exitButton = document.getElementById(
        "exit-mxr-button",
      ) as UIKit.Text;

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

    this.world.visibilityState.subscribe(() => {
      if (this.domToggle) {
        updateDomToggle(this.world, this.domToggle);
      }
    });

    if (this.domToggle) {
      updateDomToggle(this.world, this.domToggle);
    }
  }

  update() {
    this.syncHeadFollow();
  }

  private syncHeadFollow(): void {
    if (!this.toggleEntity) return;

    const immersive =
      this.world.visibilityState.value !== VisibilityState.NonImmersive;
    const useSpatialExit = immersive && !isLocalDevHost();

    if (useSpatialExit) {
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
    const useSpatialExit = immersive && !isLocalDevHost();

    if (this.domToggle) {
      this.domToggle.style.display = useSpatialExit ? "none" : "flex";
      updateDomToggle(this.world, this.domToggle);
    }

    if (this.toggleEntity?.object3D) {
      this.toggleEntity.object3D.visible = useSpatialExit;
    }
  }
}

export function createXrToggle(world: World): Entity {
  const entity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: TOGGLE_CONFIG,
      maxHeight: 0.07,
      maxWidth: 0.07,
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

  if (entity.object3D) {
    entity.object3D.visible = false;
  }

  return entity;
}
