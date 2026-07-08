# VR Interactions Playground

A minimal [Immersive Web SDK (IWSDK)](https://iwsdk.dev/) playground for testing WebXR interactions across phone, desktop, and headset before implementing them in production apps.

The first experiment is a **grabbable sphere visualizer** with one-hand, two-hand, and distance grab support, plus hover/press/grab visual feedback and an anchored controls panel.

## Requirements

- Node.js `>=20.19.0` or `>=22.12.0` (IWSDK engine requirement)
- A modern browser with WebXR support
- Optional: Meta Quest or Android phone for device testing

## Quick start

```bash
npm install
npm run dev
```

The dev server runs over **HTTPS** (required for WebXR). Vite prints local and network URLs, for example:

- `https://localhost:8081/`
- `https://192.168.x.x:8081/`

Check the resolved URL anytime with:

```bash
npm run dev:status
```

## What to test

### Sphere interactions

- **One-hand grab**: grip controller or hand pinch, then move/rotate
- **Two-hand grab**: use both hands/controllers to scale and rotate
- **Distance grab**: point with the ray pointer and pull the trigger
- **Visual feedback**: blue (idle) → cyan (hover) → orange (pressed/grabbed)

### Controls panel

The panel explains input mappings and exposes session buttons:

- **Enter VR** — immersive VR (locomotion floor enabled)
- **Enter AR** — passthrough AR with anchored panel
- **Exit XR** — return to browser view

In AR, the panel is anchored in real space via `XRAnchor`.

## Cross-device testing

| Device | URL | What to verify |
|--------|-----|----------------|
| Desktop | `https://localhost:8081` | IWER emulation, pointer hover on sphere, Enter VR |
| Phone (Android Chrome) | `https://<computer-ip>:8081` | Tap sphere in browser, Enter AR, pinch/grab |
| Quest headset | Network URL or ADB forward | VR + AR passthrough, controller and hand grab |

### Desktop (IWER)

1. Open the **local** HTTPS URL
2. Accept the self-signed certificate warning
3. Use the controls panel or click **Enter VR**
4. IWER activates on localhost automatically

### Phone

1. Connect phone and computer to the same Wi-Fi
2. Open the **network** HTTPS URL on the phone
3. Accept the certificate warning
4. Tap the sphere to confirm pointer feedback
5. Tap **Enter AR** to test room-scale interaction

### Headset (Quest)

**Method 1 — Network URL (recommended)**

1. Open the network URL in the Quest browser
2. Accept the certificate warning
3. Test VR and AR from the controls panel

**Method 2 — ADB port forwarding**

1. Connect headset via USB with developer mode enabled
2. Open `chrome://inspect/#devices` on your computer
3. Forward port `8081` to the headset
4. Open `https://localhost:8081` in the Quest browser

## Troubleshooting

- **Certificate warning**: expected for local HTTPS; proceed to trust the dev cert
- **WebXR button missing**: ensure you are on HTTPS, not HTTP
- **Phone cannot connect**: check firewall, same Wi-Fi, and use the network URL from `npm run dev`
- **IWER on headset**: IWER is disabled on IP/network access by default; use native WebXR on device
- **AR unavailable on desktop**: AR requires a real AR device; use VR emulation or a phone/headset

## Project structure

```
src/
  index.ts            # World bootstrap
  playground.ts       # Scene setup, floor, systems
  sphere.ts           # Grabbable sphere entity
  sphere-feedback.ts  # Hover/press/grab visuals
  controls-panel.ts   # Spatial UI + session buttons
  session-mode.ts     # AR/VR switching helpers
ui/
  controls-panel.uikitml
```

## References

- [IWSDK documentation](https://iwsdk.dev/)
- [IWSDK overview (Meta)](https://developers.meta.com/horizon/documentation/web/iwsdk-overview/)
- [Testing guide](https://iwsdk.dev/guides/02-testing-experience)
- [Grabbing concepts](https://iwsdk.dev/concepts/grabbing/)
