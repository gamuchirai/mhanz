fn main() {
    if let Err(err) = tauri_build::try_build(tauri_build::Attributes::new()) {
        eprintln!(
            "cargo:warning=tauri-build skipped windows resource compilation: {:?}",
            err
        );
    }
}
