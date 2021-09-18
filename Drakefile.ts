import {
  desc,
  execute,
  glob,
  run,
  task,
} from "https://deno.land/x/drake@v1.5.0/mod.ts#^";
import { exec } from "./mod.ts";
import { stripAnsi } from "https://deno.land/x/gutenberg@0.1.5/ansi/strip/mod.ts#^";
import { titleCase } from "https://deno.land/x/case@v2.1.0/mod.ts#^";
import { udd } from "https://deno.land/x/udd@0.5.0/mod.ts#^";
import * as semver from "https://deno.land/x/semver@v1.4.0/mod.ts#^";

function fileExists(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

desc("Onboard a new developer, the first task you run after cloning.");
task("onboard", [], async function () {
  const jobs = [];
  jobs.push(exec({ cmd: ["npm", "install"], prefix: "npm" }));
  jobs.push(
    exec({ cmd: ["git", "config", "pull.rebase", "true"], prefix: "git" }),
  );
  jobs.push(exec({
    cmd: ["git", "config", "core.hooksPath", `${Deno.cwd()}/.hooks`],
    prefix: "git",
  }));
  jobs.push(exec({
    cmd: ["git", "config", "commit.template", `${Deno.cwd()}/.gitmessagetpl`],
    prefix: "git",
  }));
  await Promise.all(jobs);
});

let stagedFiles: string[] = [];
desc("GitHook: pre-commit");
task("pre-commit", [], async function () {
  stagedFiles = (await exec({
    cmd: ["git", "diff", "--name-only", "--cached"],
    inheritStdio: false,
  })).stdout().split("\n").filter((_) => _ !== "").filter((_) => fileExists(_));
  await execute("fmt");
  await execute("lint");
  const cmd = ["git", "add"];
  cmd.push(...stagedFiles);
  await exec({ cmd });
});

desc("GitHook: commit-msg");
task("commit-msg", [], async function () {
  await exec({
    cmd: ["./node_modules/.bin/commitlint", "-e", "-V"],
  });
});

desc("GitHook: pre-push");
task("pre-push", ["test"]);

desc("Lint TypeScript source code");
task("lint", [], async function () {
  const cmd = ["deno", "lint"];
  const files: string[] = [];
  if (stagedFiles.length > 0) {
    files.push(
      ...stagedFiles.filter((_) =>
        _.endsWith(".ts") || _.endsWith(".tsx") || _.endsWith(".js") ||
        _.endsWith(".jsx")
      ),
    );
  } else {
    files.push(
      ...glob(
        "!(\\.asdf|node_modules)/**/*.{ts,tsx,js,jsx}",
        "*.{ts,tsx,js,jsx}",
      ),
    );
  }
  if (files.length > 0) {
    cmd.push(...files);
    await exec({ cmd, prefix: "lint" });
  }
});

desc("Format TypeScript/JSON/Markdown files");
task("fmt", [], async function () {
  const cmd = ["deno", "fmt"];
  const files: string[] = [];
  if (stagedFiles.length > 0) {
    files.push(
      ...stagedFiles.filter((_) =>
        _.endsWith(".ts") || _.endsWith(".tsx") || _.endsWith(".js") ||
        _.endsWith(".jsx") || _.endsWith(".json") || _.endsWith(".jsonc") ||
        _.endsWith(".md")
      ).filter((_) => !_.endsWith("lock.json")),
    );
  } else {
    files.push(
      ...glob(
        "!(\\.asdf|node_modules)/**/*.{ts,tsx,js,jsx,json,jsonc,md}",
        "*.{ts,tsx,js,jsx,json,jsonc,md}",
      ).filter((_) => _ !== "CHANGELOG.md").filter((_) =>
        !_.endsWith("lock.json")
      ),
    );
  }
  if (files.length > 0) {
    cmd.push(...files);
    await exec({ cmd, prefix: "fmt" });
  }
});

desc("Executes the test suite for this library");
task("test", [], async function () {
  await exec({
    cmd: [
      "deno",
      "test",
      "-A",
      "--unstable",
      "--lock",
      "deps.lock.json",
      "lib/",
    ],
    prefix: "test",
  });
});

desc("Automatically updates the entire solution");
task("update", [
  "updateAllAsdfPlugins",
  "updateAllTools",
  "updateNodeModules",
  "updateDenoModules",
  "updateDrakefile",
]);

desc(`Update all node modules as defined in package.json`);
task(`updateNodeModules`, [], async function () {
  const outdated = JSON.parse(
    (await exec({ cmd: ["npm", "outdated", "--json"], inheritStdio: false }))
      .stdout(),
  ) as Record<
    string,
    {
      current: string;
      wanted: string;
      latest: string;
      dependent: string;
      location: string;
    }
  >;

  for (const [pkg, details] of Object.entries(outdated)) {
    const packageSrc = await Deno.readTextFile("package.json");
    const packageLockSrc = await Deno.readTextFile("package-lock.json");

    const packages = JSON.parse(packageSrc);
    const latestVersion = semver.clean(details.latest);
    const currentVersion = semver.coerce(packages["dependencies"][pkg])
      ?.version;

    if (currentVersion !== latestVersion) {
      console.log(
        `updateNodeModules | ${pkg} from ${currentVersion} to ${latestVersion}`,
      );
      packages["dependencies"][pkg] = `^${latestVersion}`;

      await Deno.writeTextFile(
        "package.json",
        JSON.stringify(packages, null, 2),
      );

      try {
        await exec({
          cmd: [
            "npm",
            "update",
            pkg,
            "--package-lock-only",
            "--ignore-scripts",
            "--no-progress",
          ],
          prefix: "updateNodeModules",
        });
      } catch {
        console.log(
          `updateNodeModules | rolling back, update of ${pkg} failed`,
        );
        await Deno.writeTextFile("package.json", packageSrc);
        await Deno.writeTextFile("package-lock.json", packageLockSrc);

        const wantedVersion = semver.clean(details.wanted);
        if (currentVersion !== wantedVersion) {
          console.log(
            `updateNodeModules | attempt to update ${pkg} to ${wantedVersion} instead`,
          );
          packages["dependencies"][pkg] = `^${wantedVersion}`;
          await Deno.writeTextFile(
            "package.json",
            JSON.stringify(packages, null, 2),
          );
          try {
            await exec({
              cmd: [
                "npm",
                "update",
                pkg,
                "--package-lock-only",
                "--ignore-scripts",
                "--no-progress",
              ],
              prefix: "updateNodeModules",
            });
          } catch {
            console.log(
              `updateNodeModules | rolling back, update of ${pkg} failed`,
            );
            await Deno.writeTextFile("package.json", packageSrc);
            await Deno.writeTextFile("package-lock.json", packageLockSrc);
          }
        }
      }
    }
  }

  const packageSrc = await Deno.readTextFile("package.json");
  const packageLockSrc = await Deno.readTextFile("package-lock.json");
  try {
    console.log(
      `updateNodeModules | updating all transient dependencies`,
    );
    await exec({
      cmd: [
        "npm",
        "update",
        "--package-lock-only",
        "--ignore-scripts",
        "--no-progress",
      ],
      prefix: "updateNodeModules",
    });
  } catch {
    console.log(`updateNodeModules | rolling back, transient update failed`);
    await Deno.writeTextFile("package.json", packageSrc);
    await Deno.writeTextFile("package-lock.json", packageLockSrc);
  }
});

desc(`Updates all deno modules referenced in deps.ts with the udd tool`);
task(`updateDenoModules`, [], async function () {
  let updated = false;
  for (const results of await udd("deps.ts", { quiet: true })) {
    if (typeof results.message === "string" && results.success === true) {
      console.log(
        `updateDenoModules | ${results.initUrl} from ${results.initVersion} to ${
          stripAnsi(results.message)
        }`,
      );
      updated = true;
    }
  }
  if (updated) {
    await exec({
      cmd: [
        "deno",
        "cache",
        "--lock=deps.lock.json",
        "--lock-write",
        "./deps.ts",
      ],
      prefix: "updateDenoModules",
    });
  }
});

desc(`Updates all deno modules referenced in Drakefile.ts with the udd tool`);
task(`updateDrakefile`, [], async function () {
  let updated = false;
  for (const results of await udd("Drakefile.ts", { quiet: true })) {
    if (typeof results.message === "string" && results.success === true) {
      console.log(
        `updateDrakefile | ${results.initUrl} from ${results.initVersion} to ${
          stripAnsi(results.message)
        }`,
      );
      updated = true;
    }
  }
  if (updated) {
    await exec({
      cmd: [
        "deno",
        "cache",
        "--lock=Drakefile.lock.json",
        "--lock-write",
        "./Drakefile.ts",
      ],
      prefix: "updateDrakefile",
    });
  }
});

const toolPluginUpdaters: string[] = [];
const pluginVersions = await Deno.readTextFile("./.asdf/.plugin-versions");
for (const line of pluginVersions.split("\n").filter((_) => _.trim() !== "")) {
  const [tool, repo, sha] = line.trim().split(" ");
  toolPluginUpdaters.push(`updateAsdfPlugin${titleCase(tool)}`);

  desc(`Update the ${tool} asdf plugin as defined in .asdf/.plugin-versions`);
  task(`updateAsdfPlugin${titleCase(tool)}`, [], async function () {
    const result = await exec({
      cmd: [
        "git",
        "ls-remote",
        repo,
        "HEAD",
      ],
      inheritStdio: false,
    });
    const newSha = result.stdout().split("HEAD")[0].trim();
    if (sha !== newSha) {
      console.log(
        `updateAsdfPlugin${titleCase(tool)} | from ${sha} to ${newSha}`,
      );
      Deno.writeTextFileSync(
        "./.asdf/.plugin-versions",
        Deno.readTextFileSync("./.asdf/.plugin-versions").replace(
          `${tool} ${repo} ${sha}`,
          `${tool} ${repo} ${newSha}`,
        ),
      );
    } else {
      console.log(
        `updateAsdfPlugin${titleCase(tool)} | already up to date`,
      );
    }
  });
}

desc(`Update all asdf plugins as defined in .asdf/.plugin-versions`);
task(`updateAllAsdfPlugins`, [], async function () {
  await execute(...toolPluginUpdaters);
});

const toolUpdaters: string[] = [];
const toolVersions = await Deno.readTextFile("./.tool-versions");
for (const line of toolVersions.split("\n").filter((_) => _.trim() !== "")) {
  const [tool, currentVersion] = line.trim().split(" ");
  toolUpdaters.push(`update${titleCase(tool)}`);

  desc(`Update the version of ${tool} as defined in .tool-versions`);
  task(`update${titleCase(tool)}`, [], async function () {
    const latestVersion =
      (await exec({ cmd: ["asdf", "latest", tool], inheritStdio: false }))
        .stdout().trim();

    if (currentVersion !== latestVersion) {
      console.log(
        `update${titleCase(tool)} | from ${currentVersion} to ${latestVersion}`,
      );
      Deno.writeTextFileSync(
        "./.tool-versions",
        Deno.readTextFileSync("./.tool-versions").replace(
          `${tool} ${currentVersion}`,
          `${tool} ${latestVersion}`,
        ),
      );
    }
  });
}

desc(`Update the versions of all tools as defined in .tool-versions`);
task(`updateAllTools`, [], async function () {
  await execute(...toolUpdaters);
});

await run();
