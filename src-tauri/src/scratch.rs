fn main() {
    let mut builder = tauri::Builder::default();
    builder = builder.on_new_window(|window, url| {});
}
