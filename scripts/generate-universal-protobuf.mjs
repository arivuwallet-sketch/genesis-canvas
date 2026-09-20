import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const proto = "src/engine/universal/UniversalState.proto";

mkdirSync("generated/universal", { recursive: true });
mkdirSync("integrations/universal/cpp", { recursive: true });
mkdirSync("integrations/universal/csharp", { recursive: true });

execFileSync(
  "npx",
  [
    "--yes",
    "protobufjs-cli",
    "pbjs",
    "-t",
    "static-module",
    "-w",
    "es6",
    "-o",
    "generated/universal/UniversalState.js",
    proto,
  ],
  { stdio: "inherit" },
);

execFileSync(
  "npx",
  [
    "--yes",
    "protobufjs-cli",
    "pbts",
    "-o",
    "generated/universal/UniversalState.d.ts",
    "generated/universal/UniversalState.js",
  ],
  { stdio: "inherit" },
);

try {
  execFileSync(
    "protoc",
    [
      "--cpp_out=integrations/universal/cpp",
      "--csharp_out=integrations/universal/csharp",
      "--proto_path=.",
      proto,
    ],
    { stdio: "inherit" },
  );
} catch {
  console.warn(
    "protoc is not installed. TypeScript bindings were generated; install protoc to emit C++/C# bindings.",
  );
}

console.log("Universal protocol generation complete.");
