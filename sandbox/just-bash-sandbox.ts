import type { Sandbox } from "./sandbox";
import { Sandbox as JustBashSandbox } from "just-bash";
const MOUNT = "/home/user/project";
export async function createJustBashSandbox(dir: string): Promise<Sandbox> {
  const justBash = await JustBashSandbox.create({ overlayRoot: dir });
  return {
    type: "just-bash",
    workingDirectory: dir,
    readFile: async (path) => {
      const virtualPath = `${MOUNT}/${path}`;
      return justBash.readFile(virtualPath);
    },
    exec: async (command) => {
      const cmd = await justBash.runCommand(command, {
        cwd: MOUNT,
      });
      const finished = await cmd.wait();
      return {
        stdout: await cmd.output(),
        exitCode: finished.exitCode,
      };
    },
    stop: async () => {},
  };
}
