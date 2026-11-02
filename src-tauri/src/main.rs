#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Opt-in local verification only. No probe IPC or injected test code is compiled
// into release builds; the frontend cannot choose the output location.
#[cfg(debug_assertions)]
#[tauri::command]
fn desktop_probe_report(payload: String) -> Result<(), String> {
    let directory = std::env::var_os("OMNICRAFT_DESKTOP_PROBE_DIR")
        .ok_or("Desktop verification is disabled")?;
    if payload.len() > 2 * 1024 * 1024 {
        return Err("Verification report exceeds 2 MB".into());
    }
    let path = std::path::PathBuf::from(directory);
    std::fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    std::fs::write(path.join("report.json"), payload).map_err(|error| error.to_string())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let builder = tauri::Builder::default();
    #[cfg(debug_assertions)]
    let builder = builder
        .invoke_handler(tauri::generate_handler![desktop_probe_report])
        .on_page_load(|webview, payload| {
            if std::env::var_os("OMNICRAFT_DESKTOP_PROBE_DIR").is_some()
                && payload.event() == tauri::webview::PageLoadEvent::Finished
            {
                if let Err(error) = webview.eval(include_str!("../../scripts/desktop-probe.js")) {
                    eprintln!("Desktop verification script: {error}");
                }
            }
        });
    builder.run(tauri::generate_context!())?;
    Ok(())
}
