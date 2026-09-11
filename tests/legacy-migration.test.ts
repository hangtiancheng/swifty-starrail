import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { DataStore } from "@main/service/data-store";

let dataDir: string;
let dbPath: string;
let store: DataStore;

beforeEach(() => {
  dataDir = join(tmpdir(), `swifty-legacy-test-${randomUUID()}`);
  dbPath = join(tmpdir(), `swifty-legacy-test-${randomUUID()}.db`);
  mkdirSync(dataDir, { recursive: true });
  store = new DataStore(dbPath);
});

afterEach(() => {
  store.close();
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(dbPath, { force: true });
});

const writeUidFile = (dir: string, uid: string, data: unknown): void => {
  writeFileSync(
    join(dir, `${uid}.json`),
    JSON.stringify(data, null, 2),
    "utf-8",
  );
};

describe("migrateLegacyJson", () => {
  it("is a no-op when no legacy files exist", () => {
    expect(store.migrateLegacyJson("achievement", dataDir)).toEqual({
      uids: 0,
      records: 0,
    });
    expect(store.countUids("achievement")).toBe(0);
  });

  it("imports achievement uids and records", () => {
    writeFileSync(
      join(dataDir, "uids.json"),
      JSON.stringify({
        "200000000": "B",
        "100000000": "A",
      }),
      "utf-8",
    );
    writeUidFile(dataDir, "100000000", {
      "1001": { id: "1001", timestamp: 1700000000, current: 0, status: 2 },
      "1002": { id: 1002, timestamp: 1700000123, current: 3, status: 2 },
      broken: { timestamp: 1 },
    });
    writeUidFile(dataDir, "200000000", {});

    const result = store.migrateLegacyJson("achievement", dataDir);

    expect(result).toEqual({ uids: 2, records: 2 });
    expect(store.listUids("achievement")).toEqual({
      "100000000": "A",
      "200000000": "B",
    });
    // record id is normalized to the string key; entries without a valid
    // status are skipped
    expect(store.getAchievements("100000000")).toEqual({
      "1001": { id: "1001", timestamp: 1700000000, current: 0, status: 2 },
      "1002": { id: "1002", timestamp: 1700000123, current: 3, status: 2 },
    });
  });

  it("imports gacha uids and SRGF-shaped records", () => {
    writeFileSync(
      join(dataDir, "uids.json"),
      JSON.stringify({ "100000000": "A" }),
      "utf-8",
    );
    writeUidFile(dataDir, "100000000", {
      "100": {
        id: "100",
        gacha_id: "1",
        gacha_type: "301",
        item_id: "1102",
        time: "2024-01-01 12:00:00",
      },
    });

    const result = store.migrateLegacyJson("gacha", dataDir);

    expect(result).toEqual({ uids: 1, records: 1 });
    expect(store.getGachaRecords("100000000")).toEqual({
      "100": {
        id: "100",
        gacha_id: "1",
        gacha_type: "301",
        item_id: "1102",
        time: "2024-01-01 12:00:00",
      },
    });
  });

  it("is idempotent: skips when the scope already has uids", () => {
    writeFileSync(
      join(dataDir, "uids.json"),
      JSON.stringify({ "100000000": "A" }),
      "utf-8",
    );
    store.migrateLegacyJson("achievement", dataDir);

    expect(store.migrateLegacyJson("achievement", dataDir)).toEqual({
      uids: 0,
      records: 0,
    });
    expect(store.countUids("achievement")).toBe(1);
  });

  it("tolerates corrupt uids.json", () => {
    writeFileSync(join(dataDir, "uids.json"), "{not json", "utf-8");

    expect(store.migrateLegacyJson("achievement", dataDir)).toEqual({
      uids: 0,
      records: 0,
    });
    expect(store.countUids("achievement")).toBe(0);
  });

  it("tolerates corrupt per-uid files and imports the uid anyway", () => {
    writeFileSync(
      join(dataDir, "uids.json"),
      JSON.stringify({ "100000000": "A" }),
      "utf-8",
    );
    writeFileSync(join(dataDir, "100000000.json"), "{broken", "utf-8");

    const result = store.migrateLegacyJson("achievement", dataDir);

    expect(result).toEqual({ uids: 1, records: 0 });
    expect(store.hasUid("achievement", "100000000")).toBe(true);
  });

  it("skips uid keys that are not 9 digits", () => {
    writeFileSync(
      join(dataDir, "uids.json"),
      JSON.stringify({ notanumber: "X", "100000000": "A" }),
      "utf-8",
    );

    const result = store.migrateLegacyJson("achievement", dataDir);

    expect(result).toEqual({ uids: 1, records: 0 });
    expect(store.listUids("achievement")).toEqual({ "100000000": "A" });
  });
});
