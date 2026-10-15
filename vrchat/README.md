# Gai-chan — VRChat avatar (PC + Android + iOS)

`GaiChan/` is a drop-in Unity folder. Everything in it is generated from
`media/gaichan/Gaichan1.blend` by `scripts/blender/export_vrchat.py` (+ `render_vrchat_icons.py`).

| | |
|---|---|
| Height | 1.5 m |
| Triangles | 6,036 (mobile *Excellent* ≤ 7,500) |
| Meshes / materials | 1 skinned mesh, 1 material |
| Bones | 19 (humanoid) |
| Texture | one 512² atlas, point-filtered, uncompressed (1 MB) |
| PhysBones / particles / lights | none |

Expected performance rank: **Excellent** on PC and on mobile.

## Uploading

You need: Windows, the [VRChat Creator Companion](https://vrchat.com/home/download), Unity
**2022.3.22f1** with **Android Build Support** and **iOS Build Support** modules, and a VRChat
account at *New User* trust rank or higher.

1. In the Creator Companion, create a new **Avatar** project and open it.
2. Copy the `GaiChan` folder into the project's `Assets/` folder. Wait for Unity to import it.
3. Menu **Tools ▸ Gai-chan ▸ Set Up Avatar**. This configures the model (humanoid rig, blendshapes,
   read/write), the atlas and icons (point filter, no compression), creates the materials, the FX
   animator, expression parameters and menus under `GaiChan/Generated/`, and puts a configured
   `GaiChan` avatar in the scene. Check the Console for `[Gai-chan] Avatar ready`.
4. **VRChat SDK ▸ Show Control Panel ▸ Builder**, select `GaiChan`:
   1. Platform **Windows** → *Build and Publish*. Give it a name / thumbnail.
   2. Switch platform to **Android** → *Build and Publish* (same avatar — it keeps the blueprint ID).
   3. Switch platform to **iOS** → *Build and Publish*.

   When the platform switches, the avatar's material swaps automatically: PC gets the PS1 shader,
   Android/iOS get `VRChat/Mobile/Toon Lit` (mobile VRChat only allows its own shaders). If it ever
   looks wrong, run **Tools ▸ Gai-chan ▸ Use Material For Current Platform**.

Re-running *Set Up Avatar* is safe — it regenerates its assets and reuses the avatar in the scene.

## In game

**Expression menu**

* **Expressions** — Happy, Joy, Thinking, Surprised, Embarrassed (with sweat drop), Stern, Angry, Smug.
  Toggle one on; toggle it off for her neutral face.
* **Props** (held in the right hand) — Camera, Can, Bottle, Cigarette, Yen, Lantern, Cup.

Both are saved between worlds. She blinks on her own, and her mouth lip-syncs to your voice
(lip-sync mouths sit in front of the expression mouth, so talking always shows).

**PS1 shader (PC only)** — on the material `Generated/GaiChan_PC_PS1`:

| Setting | Default | What it does |
|---|---|---|
| Vertex Snap Resolution | 200 | Snaps vertices to a coarse screen grid — the PS1 wobble. Lower = wobblier, 0 = off. |
| Stepped Motion Grid | 0.006 m | Quantises vertex positions so limbs move in small jumps. 0 = off. |
| Affine Texture Warp | 0.85 | PS1-style texture swimming. |
| Colour Levels / Dither | 32 / 1 | 15-bit colour with ordered dithering. |
| Min / Max Brightness | 0.45 / 1.15 | Keeps her readable in very dark or very bright worlds. |

People who have custom shaders blocked see VRChat's toon fallback instead.

## What's PS1 on which platform

| | PC | Android / iOS |
|---|---|---|
| Point-filtered pixel textures, low poly, segmented limbs | ✓ | ✓ |
| Stepped blink / expression / prop swaps | ✓ | ✓ |
| Vertex wobble, stepped motion, affine warp, dithering | ✓ | — (custom shaders aren't allowed on mobile) |

## Rebuilding from the .blend

```bash
blender -b media/gaichan/Gaichan1.blend -P scripts/blender/export_vrchat.py
blender -b -P scripts/blender/render_vrchat_icons.py
```

Then re-run **Tools ▸ Gai-chan ▸ Set Up Avatar** in Unity. Props, expressions and their mapping are
defined at the top of `export_vrchat.py`. `npm run dev` → `/dev/vrchat-preview.html` previews the
result in a browser (run the export with `--preview-glb dev/gaichan-vrchat-preview.glb` first).

## Notes

* Elbows/knees/neck separate slightly when bent — the model is built from rigid parts (PS1 style).
* She has no fingers, so hand gestures don't change her hands. Gestures aren't mapped to anything.
* The source model's faces are wound inconsistently (it relied on double-sided materials), so the
  exported mesh is double-sided in geometry; that's why the triangle count is ~2× the source.
* The Unity setup script and shader were compiled/validated against Unity 2022.3.22f1 and VRChat SDK
  3.10.5 assemblies, but not run inside the Unity editor. If anything in step 3 errors, the Console
  message says which step.
