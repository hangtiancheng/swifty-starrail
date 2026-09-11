import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import {
  DataStore,
  type AchievementRecord,
  type GachaRecord,
} from "@main/service/data-store";

let dbPath: string;
let store: DataStore;

beforeEach(() => {
  dbPath = join(tmpdir(), `swifty-store-test-${randomUUID()}.db`);
  store = new DataStore(dbPath);
});

afterEach(() => {
  store.close();
  rmSync(dbPath, { force: true });
});

const rec = (
  id: string,
  status: number,
  timestamp = 1700000000,
): AchievementRecord => ({ id, timestamp, current: 0, status });

const gachaRec = (id: string, itemId = "1102"): GachaRecord => ({
  id,
  gacha_id: "1",
  gacha_type: "301",
  item_id: itemId,
  time: "2024-01-01 12:00:00",
});

describe("uids", () => {
  it("upserts, lists sorted, and isolates scopes", () => {
    store.upsertUid("achievement", "200000000", "B");
    store.upsertUid("achievement", "100000000", "A");
    store.upsertUid("gacha", "100000000", "G");

    expect(store.listUids("achievement")).toEqual({
      "100000000": "A",
      "200000000": "B",
    });
    expect(store.listUids("gacha")).toEqual({ "100000000": "G" });
    expect(store.countUids("achievement")).toBe(2);
    expect(store.hasUid("achievement", "100000000")).toBe(true);
    expect(store.hasUid("gacha", "200000000")).toBe(false);
  });

  it("updates nickname on conflict", () => {
    store.upsertUid("achievement", "100000000", "Old");
    store.upsertUid("achievement", "100000000", "New");
    expect(store.listUids("achievement")).toEqual({ "100000000": "New" });
  });

  it("deletes uid with its records only for that scope", () => {
    store.upsertUid("achievement", "100000000", "A");
    store.upsertUid("gacha", "100000000", "G");
    store.upsertAchievements("100000000", [rec("1", 2)]);
    store.upsertGachaRecords("100000000", [gachaRec("10")]);

    store.deleteUid("achievement", "100000000");

    expect(store.hasUid("achievement", "100000000")).toBe(false);
    expect(store.getAchievements("100000000")).toEqual({});
    expect(store.hasUid("gacha", "100000000")).toBe(true);
    expect(Object.keys(store.getGachaRecords("100000000"))).toEqual(["10"]);
  });
});

describe("achievements", () => {
  it("round-trips records with exact values", () => {
    const records = [
      rec("1001", 2),
      rec("1002", 1, 1700000123),
      { id: "9001", timestamp: 123, current: 5, status: 2 },
    ];
    store.upsertAchievements("100000000", records);

    expect(store.getAchievements("100000000")).toEqual({
      "1001": rec("1001", 2),
      "1002": rec("1002", 1, 1700000123),
      "9001": { id: "9001", timestamp: 123, current: 5, status: 2 },
    });
  });

  it("returns records regardless of insertion order", () => {
    // Note: JS objects reorder integer-like keys ("9", "10") numerically,
    // so key order is not observable here; content equality is what matters.
    store.upsertAchievements("100000000", [rec("9", 2), rec("10", 2)]);
    expect(store.getAchievements("100000000")).toEqual({
      "9": rec("9", 2),
      "10": rec("10", 2),
    });
  });

  it("upsert overwrites timestamp, current and status", () => {
    store.upsertAchievements("100000000", [rec("1001", 2, 111)]);
    store.upsertAchievements("100000000", [rec("1001", 1, 222)]);

    expect(store.getAchievements("100000000")["1001"]).toEqual(
      rec("1001", 1, 222),
    );
  });

  it("deletes only the listed ids", () => {
    store.upsertAchievements("100000000", [rec("1001", 2), rec("1002", 2)]);
    store.deleteAchievements("100000000", ["1001", "missing"]);

    expect(Object.keys(store.getAchievements("100000000"))).toEqual(["1002"]);
  });

  it("replace wipes previous rows", () => {
    store.upsertAchievements("100000000", [rec("1001", 2), rec("1002", 2)]);
    store.replaceAchievements("100000000", [rec("1003", 2)]);

    expect(Object.keys(store.getAchievements("100000000"))).toEqual(["1003"]);
  });

  it("handles empty record lists as no-op", () => {
    store.upsertAchievements("100000000", []);
    store.replaceAchievements("100000000", []);
    store.deleteAchievements("100000000", []);
    expect(store.getAchievements("100000000")).toEqual({});
  });
});

describe("gacha records", () => {
  it("preserves SRGF field names through the round-trip", () => {
    store.upsertGachaRecords("100000000", [gachaRec("10")]);

    expect(store.getGachaRecords("100000000")).toEqual({
      "10": gachaRec("10"),
    });
  });

  it("merge upsert keeps existing records untouched", () => {
    store.upsertGachaRecords("100000000", [gachaRec("10")]);
    store.upsertGachaRecords("100000000", [
      gachaRec("10", "9999"),
      gachaRec("11"),
    ]);

    const records = store.getGachaRecords("100000000");
    expect(records["10"].item_id).toBe("1102");
    expect(records["11"].item_id).toBe("1102");
  });

  it("replace overwrites all records for the uid", () => {
    store.upsertGachaRecords("100000000", [gachaRec("10"), gachaRec("11")]);
    store.replaceGachaRecords("100000000", [gachaRec("12")]);

    expect(Object.keys(store.getGachaRecords("100000000"))).toEqual(["12"]);
  });
});

describe("persistence", () => {
  it("keeps data across reopen", () => {
    store.upsertUid("achievement", "100000000", "A");
    store.upsertAchievements("100000000", [rec("1001", 2)]);
    store.close();

    store = new DataStore(dbPath);
    expect(store.listUids("achievement")).toEqual({
      "100000000": "A",
    });
    expect(store.getAchievements("100000000")).toEqual({
      "1001": rec("1001", 2),
    });
  });
});
