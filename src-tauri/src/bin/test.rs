fn main() {
    let mut builder = tauri::Builder::default();
    builder = builder.setup(|app| {
        let mut main_window_builder = tauri::WebviewWindowBuilder::new(
            app,
            "main",
            tauri::WebviewUrl::App("index.html".into())
        )
        .title("RC Browser")
        .inner_size(1200.0, 800.0)
        .resizable(true)
        .decorations(false)
        .transparent(true)
        .center();

        let app_handle = app.handle().clone();
        main_window_builder = main_window_builder.on_new_window(move |url, _features| {
            let url_str = url.as_str().to_string();
            use tauri::Emitter;
            let _ = app_handle.emit("open-new-tab", serde_json::json!({ "url": url_str }));
            tauri::webview::NewWindowResponse::Deny
        });

        let _ = main_window_builder.build().unwrap();
        Ok(())
    });
}
