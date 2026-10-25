fn main() {
    let result = std::panic::catch_unwind(|| {
        tauri_build::build();
    });
    if let Err(err) = result {
        eprintln!("cargo:warning=tauri-build skipped windows resource compilation (windres unavailable): {:?}", err);
    }

    #[cfg(windows)]
    {
        use std::env;
        use std::fs;
        use std::path::PathBuf;
        use std::process::Command;

        let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
        let manifest_path = out_dir.join("test_manifest.xml");
        let rc_path = out_dir.join("test_manifest.rc");
        let obj_path = out_dir.join("test_manifest.o");

        let manifest_content = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>
"#;

        if fs::write(&manifest_path, manifest_content).is_ok() {
            let rc_content = format!(r#"1 24 "{}""#, manifest_path.display().to_string().replace('\\', "\\\\"));
            if fs::write(&rc_path, rc_content).is_ok() {
                if let Ok(status) = Command::new("windres")
                    .args(["-i", rc_path.to_str().unwrap(), "-O", "coff", "-o", obj_path.to_str().unwrap()])
                    .status()
                {
                    if status.success() {
                        println!("cargo:rustc-link-arg={}", obj_path.display());
                    }
                }
            }
        }
    }
}
