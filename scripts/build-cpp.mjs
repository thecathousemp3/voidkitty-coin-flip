import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "cpp", "flip.cpp");
const binDir = resolve(root, "bin");
const output = resolve(binDir, process.platform === "win32" ? "flip.exe" : "flip");
mkdirSync(binDir, { recursive: true });

for (const compiler of ["g++", "clang++"]) {
  try {
    execFileSync(compiler, [source, "-std=c++17", "-O2", "-o", output], {
      cwd: root,
      stdio: "inherit"
    });
    console.log(`C++ coin-flip server built: ${output}`);
    process.exit(0);
  } catch {
    // Try the next installed compiler.
  }
}

if (process.platform === "win32") {
  const vswhere = resolve(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft Visual Studio", "Installer", "vswhere.exe");
  if (existsSync(vswhere)) {
    const installationPath = execFileSync(vswhere, [
      "-latest", "-products", "*", "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property", "installationPath"
    ], { encoding: "utf8" }).trim();
    if (installationPath) {
      const setupScript = resolve(binDir, "setup-vs-env.cmd");
      let compiled = false;
      try {
        const devCmd = resolve(installationPath, "Common7", "Tools", "VsDevCmd.bat");
        writeFileSync(setupScript, `@echo off\r\ncall "${devCmd}" -arch=x64 -host_arch=x64 >nul\r\nif errorlevel 1 exit /b %errorlevel%\r\nset\r\n`);
        const environmentOutput = execFileSync("cmd.exe", ["/d", "/c", setupScript], {
          cwd: binDir,
          encoding: "utf8"
        });
        const environment = { ...process.env };
        for (const line of environmentOutput.split(/\r?\n/)) {
          const separator = line.indexOf("=");
          if (separator > 0) environment[line.slice(0, separator)] = line.slice(separator + 1);
        }
        const pathEntry = Object.entries(environment)
          .find(([name]) => name.toLowerCase() === "path")?.[1] ?? "";
        const compiler = pathEntry.split(";")
          .map((directory) => resolve(directory, "cl.exe"))
          .find(existsSync);
        if (!compiler) throw new Error("Visual Studio developer environment did not expose cl.exe.");
        execFileSync(compiler, ["/nologo", "/std:c++17", "/O2", "/EHsc", source, "/Fe:flip.exe", "ws2_32.lib"], {
          cwd: binDir,
          env: environment,
          stdio: "inherit"
        });
        console.log(`C++ coin-flip server built: ${output}`);
        compiled = true;
      } finally {
        rmSync(setupScript, { force: true });
        rmSync(resolve(binDir, "flip.obj"), { force: true });
      }
      if (compiled) process.exit(0);
    }
  }
}

console.error("Could not compile the C++ app. Install a C++17 compiler (g++, clang++, or Visual Studio C++ Build Tools) and try again.");
process.exit(1);
