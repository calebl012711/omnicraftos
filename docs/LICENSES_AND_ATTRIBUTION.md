# Mosaic Forge — License & Attribution Report

> **Informational Notice**: This document is a technical engineering audit of repository licenses, dual-license selections, copyright notices, and trademark/branding terms performed during the creation of Mosaic Forge. It is **not** formal legal advice.

---

## 1. Licensing Principles & Selections

1. **Dual-Licensed Repositories (`MIT OR Apache-2.0`)**:
   - The `storytold/*` Craft suite repositories (`filmcraft`, `effectcraft`, `photocraft`, `lightcraft`, `vectorcraft`, `designcraft`, `pdfcraft`, `figcraft`, `wordcraft`, `soundcraft`, `deckcraft`, `gridcraft`, `cadcraft`, `craft-launcher`, `craft-libs`, `craft-i18n`, `craft-ai-integrations`, `indd-utils`) are dual-licensed under `MIT OR Apache-2.0` (`LICENSE-MIT` and `LICENSE-APACHE` in each repository root).
   - **Selected License**: **`MIT`** is explicitly selected for all 18 dual-licensed repositories.
2. **Single-Licensed MIT Repositories**:
   - `tangency-labs/solidcraft` (`LICENSE`) — **MIT**.
   - `tangency-labs/fieldcraft` (`LICENSE`) — **MIT**.
3. **Permissive Non-MIT Dependencies (Documented & Included)**:
   - `tangency-labs/solidcore` (`LICENSE`) — **Apache-2.0** (Permissive; derived from NVIDIA USD BRep / SMLib geometric kernel; required by `solidcraft`).
   - `storytold/craft-fonts` (`OFL.txt`, `Apache-2.0.txt`, `UFL.txt`) — **SIL Open Font License 1.1 (OFL-1.1)**, **Apache-2.0**, and **Ubuntu Font Licence 1.0**. Required font copyright and license headers are preserved intact.
4. **Blocked & Excluded Repositories**:
   - **`tangency-labs/pcbcraft` — BLOCKED (`GPL-3.0`)**: Licensed under the strong copyleft GNU General Public License v3.0. Excluded from checkout, build, and distribution so Mosaic Forge remains free of copyleft licensing obligations.
   - **`storytold/AniCraft` — BLOCKED (Empty Stub)**: Repository has 0 commits, 0 KB size, and no license file as of `2026-10-31`.
5. **Upstream Brand Asset Removal (`docs/brand/LICENSE-brand.txt` Compliance)**:
   - Each upstream `storytold/*` repository contains `docs/brand/LICENSE-brand.txt`, which states:
     > *"The ArtCraft name, wordmark, app names, and logos in `docs/brand/` are proprietary and are not licensed under the MIT or Apache-2.0 licenses. If you distribute a modified version or fork, you must remove or replace the branding in `docs/brand/`."*
   - **Compliance Action Taken**: None of the `docs/brand/` files are distributed in `public/` or `dist/`. All 14 embedded editor HTML entry points (`public/editors/<appId>/index.html`) have been updated to use the custom **Mosaic Forge** geometric mark (`public/mosaic-forge-mark.svg`) and Mosaic Forge workspace titles, while providing accurate plain-text attribution to the upstream open-source projects as permitted by `LICENSE-brand.txt`.
6. **Zero Proprietary Adobe Assets**:
   - Zero Adobe code, icons, fonts, or artwork are included anywhere in this project.

---

## 2. Complete Repository License & Attribution Inventory

| ID | Upstream Repository | Pinned Commit SHA | Declared License | Selected License | License Files in `upstream/<id>/` | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `solidcraft` | `tangency-labs/solidcraft` | `56b77b405dfedfa287a4a4c1d18d76aa96c79214` | `MIT` | **MIT** | `LICENSE` | Integrated |
| `filmcraft` | `storytold/filmcraft` | `95cf47b883f22b4abffbeff22296e29c192eb441` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `photocraft` | `storytold/photocraft` | `1f984bffb331d760a80dd6c2276878950f491df2` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `effectcraft` | `storytold/effectcraft` | `f4f390b1531bc573790922f2c3f63d519df11d99` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `lightcraft` | `storytold/lightcraft` | `c50b74df9c5f27ab8d9551b1146b779b9384a026` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `vectorcraft` | `storytold/vectorcraft` | `433ddb593dfbf470f214f66bf78a6c0f822bbca3` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `designcraft` | `storytold/designcraft` | `98d8016001f4fc76ff4c2c0e657a17d475619968` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `pdfcraft` | `storytold/pdfcraft` | `eea00a6186f3bb64bd457dc3a4bfba1738b87368` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `figcraft` | `storytold/figcraft` | `b0673ffc8bb09142c5c431f6a64d36e2c26cf23b` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `wordcraft` | `storytold/wordcraft` | `6e0f7e79edf21eb280d6dfcc7994e34479263864` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `soundcraft` | `storytold/soundcraft` | `85ffa1f53eb65626cd777e7129f61717b43fa322` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `deckcraft` | `storytold/deckcraft` | `82573331a8a3ee948dfcb516b7aa332cb81b094e` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `gridcraft` | `storytold/gridcraft` | `a85b1aea3a634ff6742705d198a3811be5d8e52d` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `cadcraft` | `storytold/cadcraft` | `5caaf73e3b3de9136723770520bd01e0acde461a` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Integrated |
| `fieldcraft` | `tangency-labs/fieldcraft` | `6d9d17ea6f5e0c2596ef9e7fc2efbe459e307d34` | `MIT` | **MIT** | `LICENSE` | Source-Only |
| `craft-launcher` | `storytold/craft-launcher` | `48b1a04c187d4f605f4ee3b200bf4a6c5920e888` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Reference |
| `craft-libs` | `storytold/craft-libs` | `c39e435cc3289a134574df83d0937e588ab3b0a2` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Shared Crates |
| `craft-fonts` | `storytold/craft-fonts` | `aced4137c013777387139c255966a3c749e13d55` | `OFL-1.1 / Apache-2.0 / UFL-1.0` | **OFL-1.1 / Apache-2.0** | `OFL.txt`, `Apache-2.0.txt`, `UFL.txt` | Bundled Fonts |
| `craft-i18n` | `storytold/craft-i18n` | `cac2cf0c26c1662c5048a28505e86fb047eb5fa5` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Shared Crates |
| `craft-ai-integrations` | `storytold/craft-ai-integrations` | `e8f320321a60060ef8ca296844ab10903a8d1a8d` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Shared Crates |
| `indd-utils` | `storytold/indd-utils` | `136f973a9daf2f0ee4a7f2eeec68049e98f61918` | `MIT OR Apache-2.0` | **MIT** | `LICENSE-MIT`, `LICENSE-APACHE` | Shared Crates |
| `solidcore` | `tangency-labs/solidcore` | `9fd5b93e39402544f08d6c2276878950f491df20` | `Apache-2.0` | **Apache-2.0** | `LICENSE` | CAD Kernel |
| `pcbcraft` | `tangency-labs/pcbcraft` | *Excluded* | `GPL-3.0` | *None (Blocked)* | *N/A* | **BLOCKED** |
| `anicraft` | `storytold/AniCraft` | *Excluded* | *None* | *None (Blocked)* | *N/A* | **BLOCKED** |

---

## 3. Self-Generated Sample Assets (`public/sample-assets/`)

All test and sample media files distributed in `public/sample-assets/` (`mosaic-test-clip.mp4`, `mosaic-test-image.png`, `mosaic-tone.wav`, `mosaic-badge.svg`, `motor-plate-2d.dxf`, `motor_adapter_plate.step`, `motor_adapter_plate.stl`) were procedurally generated during the Mosaic Forge build using `ffmpeg` synthetic test sources (`testsrc2`, `sine`) and parametric scripts, and are released under **CC0-1.0 / MIT**.

---

## 4. preserved MIT & Apache-2.0 Copyright Notices

### Storytold / Craft Suite (`MIT` Selected)
```text
Copyright (c) Storytold and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### Tangency Labs — SolidCraft & FieldCraft (`MIT`) / SolidCore (`Apache-2.0`)
```text
Copyright (c) Tangency Labs and contributors
Licensed under the MIT License (SolidCraft, FieldCraft).

SolidCore B-Rep Kernel:
Copyright (c) NVIDIA Corporation and Tangency Labs.
Licensed under the Apache License, Version 2.0.
```
