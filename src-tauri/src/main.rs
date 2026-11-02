#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default().run(tauri::generate_context!())?;
    Ok(())
}
