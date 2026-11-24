import { $ } from "bun";
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { env } from "node:process";

const directory = env.SWIFT_DIRECTORY;
if (!directory) throw new Error("Missing SWIFT_DIRECTORY");

function resolveXcodeProject(dir: string): string {
  if (env.SWIFT_PROJECT) return env.SWIFT_PROJECT;
  const projects = readdirSync(dir)
    .filter((entry) => entry.endsWith(".xcodeproj"))
    .sort();
  if (projects.length !== 1) {
    throw new Error(
      `Expected one .xcodeproj in ${dir}; found ${projects.length}${projects.length ? ` (${projects.join(", ")})` : ""}. Set SWIFT_PROJECT to disambiguate.`,
    );
  }
  return projects[0]!;
}

function resolveXcodeScheme(dir: string, project: string): string {
  if (env.SWIFT_SCHEME) return env.SWIFT_SCHEME;
  const projectName = basename(project, ".xcodeproj");
  const schemesDir = join(dir, project, "xcshareddata/xcschemes");
  const schemes = existsSync(schemesDir)
    ? readdirSync(schemesDir)
        .filter((entry) => entry.endsWith(".xcscheme"))
        .map((entry) => basename(entry, ".xcscheme"))
        .sort()
    : [];
  if (schemes.includes(projectName)) return projectName;
  if (schemes.length === 1) return schemes[0]!;
  return projectName;
}

switch (Bun.argv[2]) {
  case "package": {
    // `swift test` compiles every target, the app's included, so it is the macOS compile check too.
    const pkg: { targets: { type: string }[] } = await $`swift package describe --type json`
      .cwd(directory)
      .json();
    if (pkg.targets.some((target) => target.type === "test")) await $`swift test`.cwd(directory);
    else await $`swift build`.cwd(directory);
    break;
  }
  case "app": {
    const project = resolveXcodeProject(directory);
    const scheme = resolveXcodeScheme(directory, project);
    await $`xcodebuild build -project ${project} -scheme ${scheme} -derivedDataPath DerivedData/ci -clonedSourcePackagesDirPath .build/SourcePackages CODE_SIGNING_ALLOWED=NO -configuration Release -destination ${"generic/platform=iOS Simulator"}`.cwd(
      directory,
    );
    break;
  }
  default:
    throw new Error(`Unknown Swift task: ${Bun.argv[2]}`);
}
