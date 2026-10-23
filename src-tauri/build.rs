fn main() {
    let result = std::panic::catch_unwind(|| {
        tauri_build::build();
    });
    if let Err(err) = result {
        eprintln!("cargo:warning=tauri-build skipped windows resource compilation (windres unavailable): {:?}", err);
    }
}
