# V03 WeChat Gate

Before replacing the browser prototype, the Cocos slice must pass this gate.

## Build

- Platform: WeChat Mini Game.
- Orientation: portrait.
- Main package: under 4 MB.
- Remote assets: enabled or intentionally avoided.
- Script downloads: none from remote server.
- Texture sizes: checked on low and mid range phones.

## Runtime

- 30 FPS target on a mid-range Android phone.
- Two minute survival run without a crash or obvious frame collapse.
- Drag movement remains responsive while zombies, beams, pickups, and safe zone are active.
- HUD does not overlap gameplay controls on 390x844.
- Zombies stay readable against wasteland tiles and props.
- Shadows or baked contact blobs produce visible depth similar to the WebGL reference.

## Visual

- Player class silhouette is recognizable at phone scale.
- ARC, BOOM, and FAN skills have distinct color and shape language.
- Props use height, shadow, and color separation, not flat icons.
- Safe zone and rival cues are visible without covering combat.
