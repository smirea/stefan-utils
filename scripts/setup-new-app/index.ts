#!/usr/bin/env bun --preserve-symlinks

import fs from "fs";
import path from "path";
import { env } from "node:process";
import { parseArgv } from "src/parseArgv";
import { cmd, createScript, disk, style } from "src/createScript";
import { textBlock } from "src/textBlock";

if (!env.HOME) throw new Error("HOME is not set");

const codePath = path.join(env.HOME, "code");
const defaultLocalhostPrefixArg = "__default_localhost_prefix__";

function normalizeArgv(argv: string[]) {
  const normalized = [];
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]!;
    normalized.push(value);
    if (value === "--localhost" && (!argv[i + 1] || argv[i + 1]!.startsWith("-"))) {
      normalized.push(defaultLocalhostPrefixArg);
    }
  }
  return normalized;
}

const { args } = parseArgv({
  description: "Scaffold an app from the shared templates",
  args: normalizeArgv(process.argv.slice(2)),
  options: {
    name: { type: "string", short: "n", description: "folder and app name" },
    path: { type: "string", short: "p", default: codePath },
    type: {
      type: "string",
      short: "t",
      choices: ["node", "client-server", "monorepo-swift", "swift", "empty", "chrome-extension"],
      default: "client-server",
    },
    repo: {
      type: "string",
      short: "g",
      description: "github repo type",
      default: "public",
      choices: ["public", "private", "internal", "none"],
    },
    "overwrite-existing-repo": {
      type: "boolean",
      default: false,
      description:
        "replace the local app folder and force-push fresh history to an existing GitHub repo",
    },
    localhost: {
      type: "string",
      optional: true,
      description:
        'localias host prefix for client-server apps, defaults to app name; generated host uses .localhost; use "none" to disable',
    },
    port: {
      type: "string",
      optional: true,
      description: "client port for client-server apps, API uses the next port",
    },
  },
});

const root = path.join(args.path, args.name);
const defaultClientPort = 3000;
const assetFilePath = (file: string) => path.join(__dirname, "files", file);
const hasClientServer = args.type === "client-server" || args.type === "monorepo-swift";
const hasBunScaffold = args.type !== "swift" && args.type !== "empty";
const hasEnv = hasClientServer;
const hasCi = args.type !== "empty";

function scaffoldTooling() {
  const copyTree = (from: string) => {
    for (const file of fs.readdirSync(assetFilePath(from), { recursive: true, encoding: "utf8" })) {
      if (
        path.basename(file) === ".DS_Store" ||
        fs.statSync(assetFilePath(path.join(from, file))).isDirectory()
      )
        continue;
      disk.createDir(path.dirname(file));
      disk.copyFile({ from: assetFilePath(path.join(from, file)), to: file });
    }
  };
  copyTree("tooling");
}

// env-manager writes readers as generated output, so skip linting them.
function ignoreEnvReaders(readers: string[]) {
  disk.updateJsonFile(".oxlintrc.json", (data) => ({
    ...data,
    ignorePatterns: [...data.ignorePatterns, ...readers],
  }));
}

// CI never runs env-manager, so no per-target values file exists there. A script that runs from a subdirectory, and
// xcodebuild, read the required schema defaults from the workflow's environment instead.
function workflowEnv(network: { apiPort: number; clientPort: number }) {
  return textBlock`
		# The schema defaults that the committed readers and check scripts require. CI never runs env-manager, so no
		# per-target values file exists: scripts that run from a subdirectory and xcodebuild read these instead. Nothing
		# here is secret. A job that needs a credential takes it from a repository secret.
		env:
		  API_URL: http://127.0.0.1:${network.apiPort}
		  API_PORT: ${network.apiPort}
		  UI_PORT: ${network.clientPort}
		  APP_ENV: development

	`;
}

function scaffoldGithub(
  branch: string,
  clientServerNetwork?: { apiPort: number; clientPort: number },
) {
  const hasSwift = args.type === "swift" || args.type === "monorepo-swift";
  const template = (file: string) => fs.readFileSync(assetFilePath("github/" + file), "utf8");
  const indent = (content: string, spaces: number) =>
    content
      .split("\n")
      .map((line) => (line ? " ".repeat(spaces) + line : line))
      .join("\n");
  disk.createDir(".github/workflows");
  disk.copyFile({ from: assetFilePath("github/CI.md"), to: ".github/CI.md" });
  disk.copyFile({ from: assetFilePath("github/dependabot.yml"), to: ".github/dependabot.yml" });
  if (hasSwift) {
    disk.createDir(".github/scripts");
    for (const file of ["changes.ts", "swift.ts"]) {
      disk.copyFile({ from: assetFilePath("github/" + file), to: ".github/scripts/" + file });
    }
  }
  // Only the Swift jobs wait for change detection: it picks their macOS runner. The Bun jobs take seconds, so they
  // start at once and always run.
  const workflow =
    template("ci.yml") +
    [...(hasBunScaffold ? ["bun.yml"] : []), ...(hasSwift ? ["changes.yml", "swift.yml"] : [])]
      .map((file) => indent(template(file), 2))
      .join("\n");
  disk.writeFile(
    ".github/workflows/ci.yml",
    workflow
      .replaceAll("__BRANCH__", JSON.stringify(branch))
      .replaceAll("__TYPE__", args.type)
      .replaceAll("__SWIFT_DIRECTORY__", args.type === "monorepo-swift" ? "app-ios" : ".")
      .replaceAll("# __ENV__\n", hasClientServer ? workflowEnv(clientServerNetwork!) + "\n\n" : "")
      .replaceAll(
        "      # __SWIFT_ENV__",
        args.type === "monorepo-swift" ? indent(template("swift-env.yml"), 6) : "",
      ),
  );
  disk.writeFile(".bun-version", Bun.version + "\n");
}

function writeReadme(network?: { clientHost?: string; clientPort: number }) {
  const template = (name: string) => fs.readFileSync(assetFilePath(`readme/${name}.md`), "utf8");
  const parts =
    args.type === "monorepo-swift"
      ? ["header", "client-server", "monorepo-swift"]
      : ["header", args.type];
  const webUrl =
    network &&
    (network.clientHost
      ? `http://${network.clientHost}`
      : `http://localhost:${network.clientPort}`);
  disk.writeFile(
    "README.md",
    parts
      .map(template)
      .join("\n")
      .replaceAll("{{APP_NAME}}", () => args.name)
      .replaceAll("{{DATE}}", new Date().toISOString().slice(0, 10))
      .replaceAll("{{TYPE}}", args.type)
      .replaceAll("{{WEB_URL}}", webUrl ?? "")
      .replaceAll("{{CI}}", hasCi ? " `.github/CI.md` describes the CI checks." : ""),
  );
  if (fs.existsSync(disk.getAbsolutePath("AGENTS.md"))) {
    const agents = fs.readFileSync(disk.getAbsolutePath("AGENTS.md"), "utf8");
    disk.writeFile(
      "AGENTS.md",
      `${agents}\n# README\n\n- \`README.md\` starts as the scaffold's placeholder. Once the project takes shape, rewrite it for this project and keep it short.\n`,
    );
  }
}

function shellQuote(value: string) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

function hasPathCommand(command: string) {
  return (env.PATH ?? "")
    .split(path.delimiter)
    .some((dir) => fs.existsSync(path.join(dir, command)));
}

function getInviteAiCommand(repo: string) {
  if (hasPathCommand("git-invite-ai-to-repos")) {
    return `git-invite-ai-to-repos --repos ${shellQuote(repo)}`;
  }

  const scriptPath = path.join(codePath, "scripts", "src", "git-invite-ai-to-repos.ts");
  if (fs.existsSync(scriptPath)) {
    return `bun ${shellQuote(scriptPath)} --repos ${shellQuote(repo)}`;
  }
}

function parsePort(port: string | undefined) {
  if (!port) return;
  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65534) {
    throw new Error("--port must be an integer from 1 to 65534");
  }
  return parsedPort;
}

function getNextLocaliasPort(listOutput: string) {
  const ports = Array.from(listOutput.matchAll(/->\s*(\d+)/g), (match) => Number(match[1]));
  const maxPort = Math.max(5990, ...ports.filter(Number.isFinite));
  return Math.floor(maxPort / 10) * 10 + 10;
}

function getLocalhostPrefix(value: string) {
  const prefix = value.trim().toLowerCase();
  if (prefix === "none") return false;
  if (prefix.endsWith(".local")) {
    throw new Error("mDNS is shit, use .localhost bro trust me");
  }
  if (!/^[a-z0-9-]+$/.test(prefix)) {
    throw new Error("--localhost must contain only letters, numbers, and dashes");
  }
  return prefix;
}

function getClientServerNetworkConfig() {
  const port = parsePort(args.port);
  const localhost = args.localhost;
  const localhostPrefix = getLocalhostPrefix(
    !localhost || localhost === defaultLocalhostPrefixArg ? args.name : localhost,
  );
  if (localhostPrefix === false) {
    const clientPort = port ?? defaultClientPort;
    const apiPort = clientPort + 1;
    return {
      apiPort,
      clientPort,
    };
  }

  const clientHost = `${localhostPrefix}.localhost`;
  const listOutput = cmd("localias list", { stdio: "pipe", encoding: "utf8" }).toString();
  let existingPort: number | undefined;
  if (args["overwrite-existing-repo"]) {
    const mapping = listOutput.split("\n").map((line) => line.trim().split(/\s*->\s*/));
    existingPort = parsePort(mapping.find(([host]) => host === clientHost)?.[1]);
    if (existingPort && port && port !== existingPort)
      throw new Error(`Existing localias mapping for ${clientHost} uses port ${existingPort}`);
  }
  const clientPort = existingPort ?? port ?? getNextLocaliasPort(listOutput);
  const apiPort = clientPort + 1;
  return {
    apiPort,
    clientHost,
    clientPort,
    needsLocaliasSetup: !existingPort,
  };
}

function scaffoldSwift(directory = ".") {
  const target = (file: string) => path.join(directory, file);
  const runner = "scripts/run";
  const hasConfig = directory !== ".";
  disk.createDir(directory);
  // A standalone app gets the shared root README instead.
  const files = [
    ".gitignore",
    "AGENTS.md",
    "Package.swift",
    ...(directory === "." ? [] : ["README.md"]),
  ];
  for (const file of files) {
    const template = fs.readFileSync(assetFilePath("swift/" + file), "utf8");
    disk.writeFile(
      target(file),
      template
        .replaceAll("{{APP_NAME}}", () => args.name)
        .replaceAll("__PACKAGE_NAME__", () => JSON.stringify(args.name)),
    );
  }
  for (const folder of ["Sources", "App.xcodeproj"]) {
    disk.copyDir({ from: assetFilePath("swift/" + folder), to: target(folder) });
  }
  disk.createDir(target(path.dirname(runner)));
  disk.copyFile({ from: assetFilePath("swift/scripts/run"), to: target(runner) });
  fs.chmodSync(disk.getAbsolutePath(target(runner)), 0o755);
  const projectFile = target("App.xcodeproj/project.pbxproj");
  const template = fs.readFileSync(disk.getAbsolutePath(projectFile), "utf8");
  const bundleName = args.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  disk.writeFile(
    projectFile,
    template
      .replaceAll("{{APP_NAME}}", () => JSON.stringify(args.name))
      .replaceAll("__BUNDLE_ID__", `com.stefan.${bundleName}`)
      .replaceAll("__CONFIG_GROUP_CHILD__", hasConfig ? "A00000000000000000000016, " : "")
      .replaceAll(
        "__CONFIG_FILE_REFERENCE__",
        hasConfig
          ? 'A00000000000000000000016 = { isa = PBXFileReference; lastKnownFileType = text.xcconfig; path = Config/Base.xcconfig; sourceTree = "<group>"; };'
          : "",
      )
      .replaceAll(
        "__CONFIG_REFERENCE__",
        hasConfig ? "baseConfigurationReference = A00000000000000000000016;" : "",
      )
      .replaceAll(
        "__CONFIG_BUILD_SETTINGS__",
        hasConfig ? "INFOPLIST_FILE = Config/Info.plist;" : "",
      )
      .replaceAll("__CHECK_ENV_PHASE_REFERENCE__", hasConfig ? "A000000000000000000000E1, " : "")
      .replaceAll(
        "__CHECK_ENV_PHASE__",
        hasConfig
          ? 'A000000000000000000000E1 = { isa = PBXShellScriptBuildPhase; alwaysOutOfDate = 1; buildActionMask = 2147483647; files = (); inputPaths = ("$(SRCROOT)/Config/check-env.sh"); name = "Check environment"; outputPaths = (); runOnlyForDeploymentPostprocessing = 0; shellPath = /bin/sh; shellScript = "\\"$SRCROOT/Config/check-env.sh\\"\\n"; };'
          : "",
      ),
  );
  if (directory !== ".") {
    for (const file of ["README", "AGENTS"]) {
      const content = fs.readFileSync(disk.getAbsolutePath(target(`${file}.md`)), "utf8");
      disk.writeFile(
        target(`${file}.md`),
        content + fs.readFileSync(assetFilePath(`monorepo-swift/${file}.ios.md`), "utf8"),
      );
    }
    disk.copyDir({ from: assetFilePath("monorepo-swift/Config"), to: target("Config") });
    disk.copyFile({
      from: assetFilePath("monorepo-swift/Environment.swift"),
      to: target("Sources/App/Environment.swift"),
    });
  }
}

void createScript(async function init() {
  const dependencies = [
    "@types/bun",
    "es-toolkit",
    "lodash",
    "typescript",
    "oxlint",
    "lefthook",
    "kill-port-process",
  ];

  console.log(style.header("create root"));
  const overwriteExistingRepo = args["overwrite-existing-repo"];
  if (overwriteExistingRepo && args.repo === "none") {
    throw new Error("--overwrite-existing-repo cannot be used with --repo none");
  }
  if (
    overwriteExistingRepo &&
    (args.name === "." || args.name === ".." || path.basename(args.name) !== args.name)
  ) {
    throw new Error("--name must be a folder name when using --overwrite-existing-repo");
  }
  if (fs.existsSync(root) && !overwriteExistingRepo)
    throw new Error(`root "${root}" already exists`);
  const existingRepo: { sshUrl: string; defaultBranchRef: { name: string } | null } | undefined =
    overwriteExistingRepo
      ? JSON.parse(
          cmd(`gh repo view ${shellQuote(args.name)} --json sshUrl,defaultBranchRef`, {
            stdio: "pipe",
            encoding: "utf8",
          }).toString(),
        )
      : undefined;
  const clientServerNetwork = hasEnv ? getClientServerNetworkConfig() : undefined;
  if (overwriteExistingRepo) fs.rmSync(root, { recursive: true, force: true });
  disk.setRoot(root);
  disk.createDir(".");
  if (args.type === "swift") {
    disk.copyFile({
      from: assetFilePath("swift/vscode.code-workspace"),
      to: args.name + ".code-workspace",
    });
  } else if (hasBunScaffold) {
    for (const file of ["gitignore", "lefthook.yml", ".oxlintrc.json", "vscode.code-workspace"]) {
      const destination =
        file === "gitignore"
          ? ".gitignore"
          : file === "vscode.code-workspace"
            ? args.name + ".code-workspace"
            : file;
      disk.copyFile({ from: assetFilePath(file), to: destination });
    }
    disk.copyFile({
      from: assetFilePath(hasClientServer ? "client-server/tsconfig.json" : "tsconfig.json"),
      to: "tsconfig.json",
    });
    const swiftJob = textBlock`
			# Core's tests run on the Mac with no simulator. The first run in a new worktree also compiles the package.
			- name: swift-test
			  root: app-ios/
			  glob: '*.swift'
			  run: unset $(git rev-parse --local-env-vars); [ ! -d Tests ] || swift test
		`;
    disk.writeFile(
      "lefthook.yml",
      fs
        .readFileSync(disk.getAbsolutePath("lefthook.yml"), "utf8")
        .replace(/^( *)# __SWIFT_JOB__\n/m, (_, indent: string) =>
          args.type === "monorepo-swift" ? swiftJob.replaceAll(/^/gm, indent) + "\n" : "",
        ),
    );
  }
  cmd.setCWD(root);

  if (hasBunScaffold) {
    disk.writeJsonFile("package.json", {
      name: args.name,
      private: true,
      packageManager: `bun@${Bun.version}`,
      scripts: {
        postinstall: "lefthook install",
        lint: "oxlint --fix",
        "lint:ci": "oxlint",
        typecheck: "bun check",
        test: "bun test --pass-with-no-tests",
      },
    });
  }

  switch (args.type) {
    case "empty":
      break;
    case "node":
      disk.copyFile({ from: assetFilePath("AGENTS.node.md"), to: "AGENTS.md" });
      const src = path.join(root, "src");
      disk.createDir(src);
      disk.writeFile("src/index.ts", `console.log("Hello, ${args.name}!");\n`);
      disk.updateJsonFile("package.json", (data) => ({
        ...data,
        scripts: {
          ...data.scripts,
          dev: "bun --watch src/index.ts",
          build: "bun build src/index.ts --target bun --outdir dist",
        },
      }));
      break;
    case "client-server":
    case "monorepo-swift": {
      const network = clientServerNetwork!;
      const hasIos = args.type === "monorepo-swift";
      disk.copyFile({ from: assetFilePath("client-server/AGENTS.md"), to: "AGENTS.md" });
      console.log(style.header("create server"));
      disk.copyDir({ from: assetFilePath("client-server/apps/server"), to: "apps/server" });
      console.log(style.header("create ui"));
      disk.copyDir({ from: assetFilePath("client-server/apps/ui"), to: "apps/ui" });
      console.log(style.header("create shared"));
      disk.copyDir({ from: assetFilePath("client-server/packages/shared"), to: "packages/shared" });
      disk.writeFile(
        ".env",
        textBlock`
					# env-manager: ${args.name}
					# env-manager local:true
					# env-manager target: apps/ui format=ts path=.env.local generate=env.ts
					# env-manager target: apps/server format=ts path=.env.local generate=src/env.ts
					${hasIos ? "# env-manager target: app-ios format=swift path=Config/LocalSecrets.xcconfig generate=Config/check-env.sh" : ""}

					${hasIos ? "# env-manager targets: apps/ui,app-ios\nAPI_URL=http://127.0.0.1:" + network.apiPort + " # {url}\n\n# env-manager targets: apps/ui" : "# env-manager targets: apps/ui\nAPI_URL=http://127.0.0.1:" + network.apiPort + " # {url}"}
					UI_PORT=${network.clientPort} # {int:min(1),max(65535)}
					UI_HOST=${network.clientHost ?? ""} # {optional string}

					# env-manager targets: apps/server
					API_PORT=${network.apiPort} # {int:min(1),max(65535)}
					# \`production\` in env-manager prod. apps/server/src/config.ts requires production-only secrets.
					APP_ENV=development # {string:format(/^(development|production)$/)}
				`,
      );
      disk.updateJsonFile("package.json", (data) => ({
        ...data,
        type: "module",
        workspaces: ["apps/*", "packages/*"],
        scripts: {
          build: "bun --filter @repo/ui build && bun --filter @repo/server build",
          dev: 'concurrently --raw -k -s first "bun --filter @repo/server dev" "bun --filter @repo/ui dev --host 127.0.0.1"',
          "env:generate": "env-manager gen --local",
          lint: "oxlint --fix",
          "lint:ci": "oxlint",
          postinstall: "lefthook install",
          "server:dev": "bun --filter @repo/server dev",
          "server:start": "bun --filter @repo/server start",
          "server:typecheck": "bun --filter @repo/server typecheck",
          start: "bun --filter @repo/server start",
          ...(hasIos ? { "start:ios": "bun app-ios/scripts/run" } : {}),
          test: "bun test --pass-with-no-tests",
          typecheck:
            "bun --filter @repo/ui check && bun --filter @repo/server typecheck && bun check",
          "ui:build": "bun --filter @repo/ui build",
          "ui:check": "bun --filter @repo/ui check",
          "ui:dev": "bun --filter @repo/ui dev --host 127.0.0.1",
          "ui:preview": "bun --filter @repo/ui preview",
        },
        devDependencies: {
          "@types/node": "^26.6.6",
          "@types/bun": "^1.4.5",
          concurrently: "^10.0.7",
          lefthook: "^2.2.2",
          oxlint: "^1.95.0",
          // svelte-check-native and `bun check` type-check with TypeScript 7. @repo/ui keeps TypeScript 6 for SvelteKit, which needs the JS API TypeScript 7 lacks.
          typescript: "^7.0.2",
        },
      }));
      if (hasIos) {
        scaffoldSwift("app-ios");
        const content = fs.readFileSync(disk.getAbsolutePath("AGENTS.md"), "utf8");
        disk.writeFile(
          "AGENTS.md",
          content + "\n" + fs.readFileSync(assetFilePath("monorepo-swift/AGENTS.md"), "utf8"),
        );
      }
      ignoreEnvReaders(["apps/ui/env.ts", "apps/server/src/env.ts"]);
      break;
    }
    case "swift":
      scaffoldSwift();
      break;
    case "chrome-extension":
      for (const file of ["AGENTS.md", "tsconfig.json", "wxt.config.ts"]) {
        disk.copyFile({ from: assetFilePath("chrome-extension/" + file), to: file });
      }
      disk.copyDir({ from: assetFilePath("chrome-extension/src"), to: "src" });
      const popup = "src/entrypoints/popup/index.html";
      disk.writeFile(
        popup,
        fs
          .readFileSync(disk.getAbsolutePath(popup), "utf8")
          .replaceAll("{{APP_NAME}}", () => args.name),
      );
      disk.writeFile(
        ".gitignore",
        fs.readFileSync(disk.getAbsolutePath(".gitignore"), "utf8") + "\n# WXT\n.output\n.wxt\n",
      );
      disk.updateJsonFile(".oxlintrc.json", (data) => ({
        ...data,
        ignorePatterns: [...data.ignorePatterns, ".output", ".wxt"],
      }));
      disk.updateJsonFile("package.json", (data) => ({
        ...data,
        version: "0.1.0",
        type: "module",
        scripts: {
          ...data.scripts,
          postinstall: "wxt prepare && lefthook install",
          typecheck: "svelte-check-native --tsconfig ./tsconfig.json && bun check",
          dev: "wxt",
          "dev:firefox": "wxt -b firefox",
          build: "wxt build",
          zip: "wxt zip",
        },
      }));
      dependencies.push(
        "wxt",
        "web-ext",
        "@wxt-dev/module-svelte",
        "svelte",
        "svelte-check-native",
        "phosphor-svelte",
        "@tailwindcss/vite",
        "tailwindcss",
      );
      break;
    default:
      throw new Error(`Invalid type: ${args.type}`);
  }

  if (clientServerNetwork?.clientHost) {
    const { clientHost, clientPort } = clientServerNetwork;
    const agentsContent = fs.readFileSync(disk.getAbsolutePath("AGENTS.md"), "utf8");
    disk.writeFile(
      "AGENTS.md",
      `${agentsContent}\n- Local web host: ${clientHost} -> ${clientPort}; browser API calls use the /api proxy.\n`,
    );
    if (clientServerNetwork.needsLocaliasSetup) cmd(`localias set ${clientHost} ${clientPort}`);
  }
  if (hasBunScaffold) {
    disk.writeFile(
      "AGENTS.md",
      fs.readFileSync(disk.getAbsolutePath("AGENTS.md"), "utf8") +
        "\n" +
        fs.readFileSync(assetFilePath("AGENTS.checks.md"), "utf8"),
    );
  }
  writeReadme(clientServerNetwork);
  const branch = existingRepo?.defaultBranchRef?.name ?? "master";
  if (hasBunScaffold) {
    scaffoldTooling();
  }
  if (hasEnv) {
    cmd("env-manager init --local");
    cmd("env-manager gen --local");
  }
  if (hasCi) scaffoldGithub(branch, clientServerNetwork);

  // Before installing: the postinstall's `lefthook install` needs the repository.
  cmd(`git init -b ${shellQuote(branch)}`);
  if (hasClientServer) {
    cmd("bun install");
  } else if (hasBunScaffold) {
    cmd("bun add " + Array.from(new Set(dependencies)).sort().join(" "));
  }

  if (hasBunScaffold) {
    cmd("bun run lint");
    cmd("bun run typecheck");
  }
  cmd("git add -A");
  cmd('git commit -m "initial setup with stefan-utils/scripts/setup-new-app"');
  if (args.repo !== "none") {
    if (existingRepo) {
      cmd(`git remote add origin ${shellQuote(existingRepo.sshUrl)}`);
    } else {
      cmd(`gh repo create ${shellQuote(args.name)} --${args.repo} --source=. --remote=origin`);
    }
    cmd(`git push ${overwriteExistingRepo ? "--force " : ""}-u origin ${shellQuote(branch)}`);
    if (!overwriteExistingRepo) {
      const inviteAiCommand = getInviteAiCommand(args.name);
      if (inviteAiCommand) cmd(inviteAiCommand);
    }
  }
});
