# Browser and desktop paths

The browser app is React/TypeScript/Vite. Recorder and music routes are `/?tool=recorder` and `/?tool=music`. WASM editors are loaded only when their workspace opens. Source builds and license inventories are separate from shell builds.

Tauri v2 was selected for a desktop development prototype: it uses the system webview rather than packaging Chromium. This project has Rust and Xcode command-line tools installed, macOS 14.8.9, an Intel MacBookAir8,1 and 16 GB RAM. A desktop build is now being attempted. Until build and runtime tests pass, there is no verified installable download.

```sh
# Browser development
npm ci
npm run dev -- --host 127.0.0.1

# Separate terminal: local desktop development, using that running Vite server
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:dev

# Build an unsigned/ad-hoc signed local .app after web validation
PATH="$HOME/.cargo/bin:$PATH" npm run desktop:build
npm run desktop:info
```

Desktop development needs Vite running; it is not an offline installed app. The local bundle path, once successfully built, is `src-tauri/target/debug/bundle/macos/OmniCraft OS.app`. No application is installed into `/Applications` by these commands. No notarization, store submission or public publication is performed.

Tauri's macOS webview is WebKit. A wrapper does not add `getDisplayMedia`, MP4 encoders, system-audio capture or native filesystem integration to the recorder. Unsupported capture must show an error and be done in a supported browser until a tested native capture adapter exists. The recorder uses capability detection at runtime. Browser-origin storage and Tauri-origin storage are separate; transfer projects via their exported files, not an assumed shared database.

Native permission descriptions are supplied for explicit camera/microphone use. Only Tauri core window capabilities are granted; no native filesystem/shell plugins are exposed. CSP enforcement remains pending because inherited editor bundles use inline initialization scripts; this prototype is for local development, with no remote native commands enabled. Windows and Linux are untested.

The exact limitations and build/runtime results must be recorded separately from browser reports in `verification/desktop/`. An app process launching alone is not proof that any editor or recorder workflow works inside it.
