# Mosaic Forge

**Mosaic Forge** is a free, local-first, unified creative suite and parametric 3D CAD workspace built with **React + TypeScript + Vite** and **14 embedded Rust/WebAssembly (`eframe` / `wgpu` / WebGL2) applications**.

> **Temporary Working Name & Rebranding**: "Mosaic Forge" is a temporary working name. All product naming, tagline, colors, logo path, and domain check metadata are centralized in [`src/config/branding.ts`](./src/config/branding.ts) and can also be edited live in the **Upstream, Licenses & Config** tab of the application.

---

## 1. Quick Start

### Prerequisites
- **Node.js** `v20+` (verified on `v26.3.0`) and **npm** `10+`
- **Rust & WebAssembly Toolchain** (optional, only required when compiling upstream Rust crates from source): installed in `$HOME/.cargo/bin` (`rustc 1.99.1`, `wasm32-unknown-unknown`, `trunk 0.21.14`)

### Run Locally in Development Mode
```bash
npm install
npm run dev
```
Then open **`http://localhost:5173`** in your browser.

### Build & Preview Production Bundle
```bash
npm run build
npm run preview
```
Then open **`http://localhost:4173`**.

### Run Unit & End-to-End Verification
```bash
# Run Vitest unit suite
npm test

# Run read-only upstream Git & release comparison
npm run upstream:check

# Verify all local upstream checkouts & license files
npm run upstream:status
npm run upstream:licenses

# Run headless Chrome Playwright end-to-end verification (9A, 9B, 9C, 9E)
node scripts/verify-e2e-workflows.mjs
```

---

## 2. Integrated Workspaces & Honest Verification Status

| Workspace | Upstream Source | Pinned Version & Commit | Role in Mosaic Forge | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SolidCraft 3D CAD** | `tangency-labs/solidcraft` | `v0.29.0` (`56b77b405d`) | **Primary 3D Parametric B-Rep CAD** (`.sc`, `.step`, `.stl`) | `tested` |
| **FilmCraft Video Studio** | `storytold/filmcraft` | `v0.15.0` (`95cf47b883`) | Multi-track timeline video editing & WebCodecs export | `tested` |
| **PhotoCraft Layer Lab** | `storytold/photocraft` | `v0.18.0` (`1f984bffb3`) | Layered raster photo editing (`.pht`, `.psd`, `.png`, `.jpg`) | `tested` |
| **CADCraft 2D Drafting** | `storytold/cadcraft` | `v0.15.1` (`5caaf73e3b`) | Dedicated 2D DXF/DWG technical drafting (`?host=parent`) | `tested` |
| **VectorCraft Illustration** | `storytold/vectorcraft` | `v0.19.0` (`433ddb593d`) | Vector illustration & Bezier paths (`.vct`, `.svg`, `.pdf`) | `tested` |
| **PdfCraft Reader & Editor** | `storytold/pdfcraft` | `v0.16.1` (`eea00a6186`) | PDF reading, annotation, redaction, and forms (`?host=parent`) | `tested` |
| **FigCraft UI Design** | `storytold/figcraft` | `v0.13.1` (`b0673ffc8b`) | Interface design & interactive prototyping (`window.figcraft`) | `tested` |
| **WordCraft Documents** | `storytold/wordcraft` | `v0.13.2` (`6e0f7e79ed`) | Word processing & DOCX/Markdown/PDF publishing (`?host=parent`) | `tested` |
| **GridCraft Spreadsheets** | `storytold/gridcraft` | `v0.14.2` (`a85b1aea3a`) | Spreadsheets, formulas, & CSV/XLSX modeling (`?host=parent`) | `tested` |
| **EffectCraft Motion & VFX** | `storytold/effectcraft` | `v0.19.0` (`f4f390b153`) | Motion graphics & node/layer VFX compositing (`window.effectcraft`) | `partially tested` |
| **LightCraft RAW & Catalog** | `storytold/lightcraft` | `v0.16.0` (`c50b74df9c`) | Photo cataloging & parametric RAW development (`window.lightcraft`) | `partially tested` |
| **DesignCraft Publishing** | `storytold/designcraft` | `v0.15.2` (`98d8016001`) | Multi-page layout, spreads, & IDML/PDF desktop publishing | `partially tested` |
| **SoundCraft Audio Studio** | `storytold/soundcraft` | `v0.15.0` (`85ffa1f53e`) | Waveform & multitrack audio editing (`.wav`, `.flac`, `.mp3`) | `partially tested` |
| **DeckCraft Presentations** | `storytold/deckcraft` | `v0.13.1` (`82573331a8`) | Slide decks & PPTX/PDF presentations | `partially tested` |
| **FieldCraft Implicit CAD** | `tangency-labs/fieldcraft` | `v0.7.0` (`6d9d17ea6f`) | Source checked out in `upstream/fieldcraft` (no prebuilt web bundle) | `not tested` |
| **PCBCraft** | `tangency-labs/pcbcraft` | *Excluded* | **Blocked**: Licensed under strong copyleft `GPL-3.0` | `blocked` |
| **AniCraft** | `storytold/AniCraft` | *Excluded* | **Blocked**: Empty upstream repository (0 commits / 0 KB) | `blocked` |

---

## 3. Live Domain Check Result (`mosaicforge.com`)

- **Domain Checked**: `mosaicforge.com`
- **Checked At (UTC)**: `2026-11-01T00:14:07Z`
- **Verification Source**: Verisign COM RDAP (`https://rdap.verisign.com/com/v1/domain/mosaicforge.com`) + IANA WHOIS
- **Result**: **UNAVAILABLE (Registered)** — RDAP Handle `1988171746_DOMAIN_COM-VRSN`, Registrar `GoDaddy.com, LLC (IANA ID 146)`, Status `clientTransferProhibited`.
- **Purchased**: **No** (no domain purchase was made).

---

## 4. Documentation Index

- [**Technical Architecture & Hardware Optimization Guide (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md)
- [**License & Attribution Report (`docs/LICENSES_AND_ATTRIBUTION.md`)**](./docs/LICENSES_AND_ATTRIBUTION.md)
- [**Upstream Tracking, Update & Rollback Guide (`docs/UPSTREAM_UPDATE_GUIDE.md`)**](./docs/UPSTREAM_UPDATE_GUIDE.md)
