import { spawn } from "child_process";
import { platform } from "os";
import commandExists from "command-exists-promise";

const isMac = platform() === "darwin";

const XCODE_BUILD_CMD = "xcodebuild";

const sanitizeArg = (arg) => arg.toString().replace(/"/g, '"\'"\'"');

const defaultOptions = {
  projectDir: "./",
  args: {},
  buildAction: "build",
};

class XcodeBuildPlugin {
  constructor(options = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  apply(compiler) {
    const pluginName = XcodeBuildPlugin.name;

    compiler.hooks.afterEmit.tapAsync(pluginName, (compilation, callback) => {
      // Use the command-exists-promise package to ensure that the
      // xcodebuild command is available before running it
      if (isMac) {
        commandExists(XCODE_BUILD_CMD).then((xcodeBuildExists) => {
          if (xcodeBuildExists) {
            const buildArgs = Object.keys(this.options.args).reduce(
              (args, key) => {
                if (!this.options.args[key]) {
                  return args;
                }

                return [
                  ...args,
                  `-${key}${
                    this.options.args[key] !== true
                      ? ` "${sanitizeArg(this.options.args[key])}"`
                      : ""
                  }`,
                ];
              },
              []
            );
            if (this.options.buildAction) {
              buildArgs.push(this.options.buildAction);
            }

            console.info(
              "Building Xcode Project:",
              XCODE_BUILD_CMD,
              ...buildArgs
            );

            const xcodeBuild = spawn(XCODE_BUILD_CMD, buildArgs, {
              cwd: this.options.projectDir,
              shell: true,
            });

            xcodeBuild.stdout.on("data", (data) => {
              process.stdout.write(data);
            });

            xcodeBuild.stderr.on("data", (err) => {
              process.stderr.write(err);
            });

            xcodeBuild.on("error", (err) => {
              process.stderr.write(err);
            });

            xcodeBuild.on("close", (code) => {
              if (code) {
                console.warn(`Xcode build failed with code ${code}`);
              } else {
                console.info("Xcode build Succeeded!");
              }
              callback();
            });
          } else {
            console.warn(
              "Please install Xcode and ensure xcodebuild is available on the global path"
            );
            callback();
          }
        });
      } else {
        console.warn(
          "You must be running MacOS in order to execute an Xcode build"
        );
        callback();
      }
    });
  }
}

export default XcodeBuildPlugin;
