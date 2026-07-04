import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

const REG_PATH = "HKCU\\SOFTWARE\\miHoYo\\崩坏：星穹铁道";
const REG_NAME_DEFAULT = "GraphicsSettings_Model_h2986158309";

class UnlockFpsService {
  private regName: string | null = null;

  private async findRegName(): Promise<string | null> {
    if (this.regName) return this.regName;
    try {
      const { stdout } = await exec("reg.exe", ["query", REG_PATH]);
      const match = stdout.match(/GraphicsSettings_Model\S*/)?.[0];
      if (match) {
        this.regName = match.trim();
        return this.regName;
      }
      // Try default value
      const { stdout: defaultOut } = await exec("reg.exe", [
        "query",
        REG_PATH,
        "/v",
        REG_NAME_DEFAULT,
      ]);
      if (defaultOut.includes(REG_NAME_DEFAULT)) {
        this.regName = REG_NAME_DEFAULT;
        return this.regName;
      }
    } catch {
      // Registry key not found
    }
    return null;
  }

  private parseHexToJson(hex: string): Record<string, unknown> | null {
    try {
      const clean = hex.replace(/\s/g, "");
      // Strip trailing 00
      const trimmed = clean.endsWith("00") ? clean.slice(0, -2) : clean;
      const pairs = trimmed.match(/.{2}/g);
      if (!pairs) return null;
      const buf = Buffer.from(pairs.join(""), "hex");
      return JSON.parse(buf.toString());
    } catch {
      return null;
    }
  }

  private jsonToRegHex(json: Record<string, unknown>): string {
    const buf = Buffer.from(JSON.stringify(json));
    let hex = "";
    buf.forEach((v) => (hex += `0${v.toString(16)}`.slice(-2)));
    hex += "00";
    return hex;
  }

  private async readRegValue(): Promise<{ name: string; hex: string } | null> {
    const name = await this.findRegName();
    if (!name) return null;
    try {
      const { stdout } = await exec("reg.exe", ["query", REG_PATH, "/v", name]);
      const match = stdout.match(/REG_BINARY\s+([0-9A-Fa-f]+)/i);
      if (!match) return null;
      return { name, hex: match[1] };
    } catch {
      return null;
    }
  }

  async isUnlocked(server = "cn"): Promise<{ msg: string }> {
    if (server !== "cn") return { msg: "Only CN server is supported" };
    if (process.platform !== "win32")
      return { msg: "Only Windows is supported" };

    const reg = await this.readRegValue();
    if (!reg) return { msg: "Registry key not found" };

    const json = this.parseHexToJson(reg.hex);
    if (!json) return { msg: "Parse failed" };
    if (json["FPS"] === undefined) return { msg: "No FPS setting" };
    return { msg: json["FPS"] === 120 ? "unlocked" : "locked" };
  }

  async toggle(server = "cn"): Promise<{ msg: string; fps?: number }> {
    if (server !== "cn") return { msg: "Only CN server is supported" };
    if (process.platform !== "win32")
      return { msg: "Only Windows is supported" };

    const reg = await this.readRegValue();
    if (!reg) return { msg: "Registry key not found" };

    const json = this.parseHexToJson(reg.hex);
    if (!json) return { msg: "Parse failed" };
    if (json["FPS"] === undefined) return { msg: "No FPS setting" };

    json["FPS"] = json["FPS"] === 120 ? 60 : 120;
    const newHex = this.jsonToRegHex(json);

    try {
      await exec("reg.exe", [
        "add",
        REG_PATH,
        "/v",
        reg.name,
        "/t",
        "REG_BINARY",
        "/d",
        newHex,
        "/f",
      ]);
      return { msg: "OK", fps: json["FPS"] as number };
    } catch (err) {
      return { msg: (err as Error).message };
    }
  }
}

export const unlockFpsService = new UnlockFpsService();
