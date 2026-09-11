import knex, { type Knex } from "knex";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DatabaseSync, type StatementSync } from "node:sqlite";

export type UidScope = "achievement" | "gacha";

export interface AchievementRecord {
  id: string;
  timestamp: number;
  current: number;
  status: number;
}

// Field names follow the SRGF wire format (external contract) and are
// intentionally kept snake_case; they cross the IPC boundary as-is.
export interface GachaRecord {
  gacha_id: string;
  gacha_type: string;
  item_id: string;
  time: string;
  id: string;
}

export interface LegacyMigrationResult {
  uids: number;
  records: number;
}

type Bindings = (string | number | bigint | null)[];
const INSERT_CHUNK_SIZE = 500;

// Client-less knex: only used as a SQL builder. Statements are executed
// against node:sqlite, so no database driver is installed or required.
const kb = knex({ client: "better-sqlite3", useNullAsDefault: true });

export class DataStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.ensureTables();
  }

  private run(query: Knex.QueryBuilder): void {
    const { sql, bindings } = query.toSQL();
    this.db.prepare(sql).run(...(bindings as Bindings));
  }

  private all<T>(query: Knex.QueryBuilder): T[] {
    const { sql, bindings } = query.toSQL();
    return this.db.prepare(sql).all(...(bindings as Bindings)) as T[];
  }

  private get<T>(query: Knex.QueryBuilder): T | undefined {
    const { sql, bindings } = query.toSQL();
    return this.db.prepare(sql).get(...(bindings as Bindings)) as T | undefined;
  }

  private runPrepared(statement: StatementSync, ...bindings: Bindings): void {
    statement.run(...bindings);
  }

  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private ensureTables(): void {
    const ensure = (
      name: string,
      build: (t: Knex.CreateTableBuilder) => void,
    ): void => {
      const exists = this.get<{ name: string }>(
        kb("sqlite_master").select("name").where({ type: "table", name }),
      );
      if (exists) return;
      for (const stmt of kb.schema.createTable(name, build).toSQL()) {
        this.db.exec(stmt.sql);
      }
    };

    ensure("uids", (t) => {
      t.text("scope").notNullable();
      t.text("uid").notNullable();
      t.text("nickname").notNullable();
      t.primary(["scope", "uid"]);
    });
    ensure("achievements", (t) => {
      t.text("uid").notNullable();
      t.text("achievementId").notNullable();
      t.integer("timestamp").notNullable();
      t.integer("current").notNullable();
      t.integer("status").notNullable();
      t.primary(["uid", "achievementId"]);
    });
    ensure("gachaRecords", (t) => {
      t.text("uid").notNullable();
      t.text("id").notNullable();
      t.text("gachaId").notNullable();
      t.text("gachaType").notNullable();
      t.text("itemId").notNullable();
      t.text("time").notNullable();
      t.primary(["uid", "id"]);
    });
  }

  // ---- uids ----

  listUids(scope: UidScope): Record<string, string> {
    const rows = this.all<{ uid: string; nickname: string }>(
      kb("uids").select("uid", "nickname").where("scope", scope).orderBy("uid"),
    );
    return Object.fromEntries(rows.map((r) => [r.uid, r.nickname]));
  }

  countUids(scope: UidScope): number {
    const row = this.get<{ count: number }>(
      kb("uids").count({ count: "*" }).where("scope", scope),
    );
    return Number(row?.count ?? 0);
  }

  hasUid(scope: UidScope, uid: string): boolean {
    return this.get(kb("uids").select(1).where({ scope, uid })) !== undefined;
  }

  upsertUid(scope: UidScope, uid: string, nickname: string): void {
    this.run(
      kb("uids")
        .insert({ scope, uid, nickname })
        .onConflict(["scope", "uid"])
        .merge(["nickname"]),
    );
  }

  deleteUid(scope: UidScope, uid: string): void {
    this.transaction(() => {
      this.run(kb("uids").where({ scope, uid }).del());
      if (scope === "achievement") {
        this.run(kb("achievements").where({ uid }).del());
      } else {
        this.run(kb("gachaRecords").where({ uid }).del());
      }
    });
  }

  // ---- achievements ----

  getAchievements(uid: string): Record<string, AchievementRecord> {
    const rows = this.all<{
      achievementId: string;
      timestamp: number;
      current: number;
      status: number;
    }>(
      kb("achievements")
        .select("achievementId", "timestamp", "current", "status")
        .where({ uid })
        .orderBy("achievementId"),
    );
    return Object.fromEntries(
      rows.map((r) => [
        r.achievementId,
        {
          id: r.achievementId,
          timestamp: r.timestamp,
          current: r.current,
          status: r.status,
        },
      ]),
    );
  }

  upsertAchievements(uid: string, records: AchievementRecord[]): void {
    if (records.length === 0) return;
    this.transaction(() => {
      for (let i = 0; i < records.length; i += INSERT_CHUNK_SIZE) {
        const chunk = records.slice(i, i + INSERT_CHUNK_SIZE).map((r) => ({
          uid,
          achievementId: r.id,
          timestamp: r.timestamp,
          current: r.current,
          status: r.status,
        }));
        this.run(
          kb("achievements")
            .insert(chunk)
            .onConflict(["uid", "achievementId"])
            .merge(["timestamp", "current", "status"]),
        );
      }
    });
  }

  deleteAchievements(uid: string, ids: string[]): void {
    if (ids.length === 0) return;
    this.run(
      kb("achievements").where({ uid }).whereIn("achievementId", ids).del(),
    );
  }

  replaceAchievements(uid: string, records: AchievementRecord[]): void {
    this.transaction(() => {
      this.run(kb("achievements").where({ uid }).del());
      for (let i = 0; i < records.length; i += INSERT_CHUNK_SIZE) {
        const chunk = records.slice(i, i + INSERT_CHUNK_SIZE).map((r) => ({
          uid,
          achievementId: r.id,
          timestamp: r.timestamp,
          current: r.current,
          status: r.status,
        }));
        this.run(kb("achievements").insert(chunk));
      }
    });
  }

  // ---- gacha ----

  getGachaRecords(uid: string): Record<string, GachaRecord> {
    const rows = this.all<{
      id: string;
      gachaId: string;
      gachaType: string;
      itemId: string;
      time: string;
    }>(
      kb("gachaRecords")
        .select("id", "gachaId", "gachaType", "itemId", "time")
        .where({ uid })
        .orderBy("id"),
    );
    return Object.fromEntries(
      rows.map((r) => [
        r.id,
        {
          id: r.id,
          gacha_id: r.gachaId,
          gacha_type: r.gachaType,
          item_id: r.itemId,
          time: r.time,
        },
      ]),
    );
  }

  upsertGachaRecords(uid: string, records: GachaRecord[]): void {
    if (records.length === 0) return;
    this.transaction(() => {
      const stmt = this.db.prepare(
        "INSERT OR IGNORE INTO gachaRecords (uid, id, gachaId, gachaType, itemId, time) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const r of records) {
        this.runPrepared(
          stmt,
          uid,
          r.id,
          r.gacha_id,
          r.gacha_type,
          r.item_id,
          r.time,
        );
      }
    });
  }

  replaceGachaRecords(uid: string, records: GachaRecord[]): void {
    this.transaction(() => {
      this.run(kb("gachaRecords").where({ uid }).del());
      const stmt = this.db.prepare(
        "INSERT INTO gachaRecords (uid, id, gachaId, gachaType, itemId, time) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const r of records) {
        this.runPrepared(
          stmt,
          uid,
          r.id,
          r.gacha_id,
          r.gacha_type,
          r.item_id,
          r.time,
        );
      }
    });
  }

  // ---- legacy JSON migration (one-time import) ----

  migrateLegacyJson(scope: UidScope, dataDir: string): LegacyMigrationResult {
    const uidsPath = join(dataDir, "uids.json");
    if (!existsSync(uidsPath)) return { uids: 0, records: 0 };
    if (this.countUids(scope) > 0) return { uids: 0, records: 0 };

    let legacyUids: Record<string, unknown>;
    try {
      legacyUids = JSON.parse(readFileSync(uidsPath, "utf-8"));
    } catch {
      return { uids: 0, records: 0 };
    }
    if (!legacyUids || typeof legacyUids !== "object") {
      return { uids: 0, records: 0 };
    }

    let uids = 0;
    let records = 0;
    for (const [uid, nickname] of Object.entries(legacyUids)) {
      if (!/^\d{9}$/.test(uid)) continue;
      this.upsertUid(scope, uid, `${nickname ?? ""}`);
      uids++;

      const filePath = join(dataDir, `${uid}.json`);
      if (!existsSync(filePath)) continue;
      let raw: Record<string, Record<string, unknown>>;
      try {
        raw = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        continue;
      }
      if (!raw || typeof raw !== "object") continue;

      if (scope === "achievement") {
        const list: AchievementRecord[] = [];
        for (const [key, value] of Object.entries(raw)) {
          if (!value || typeof value !== "object") continue;
          const timestamp = Number(value["timestamp"]);
          const current = Number(value["current"]);
          const status = Number(value["status"]);
          if (!Number.isFinite(timestamp) || !Number.isFinite(status)) continue;
          list.push({
            id: key,
            timestamp,
            current: Number.isFinite(current) ? current : 0,
            status,
          });
        }
        this.upsertAchievements(uid, list);
        records += list.length;
      } else {
        const list: GachaRecord[] = [];
        for (const [key, value] of Object.entries(raw)) {
          if (!value || typeof value !== "object") continue;
          list.push({
            id: key,
            gacha_id: `${value["gacha_id"] ?? ""}`,
            gacha_type: `${value["gacha_type"] ?? ""}`,
            item_id: `${value["item_id"] ?? ""}`,
            time: `${value["time"] ?? ""}`,
          });
        }
        this.upsertGachaRecords(uid, list);
        records += list.length;
      }
    }
    return { uids, records };
  }

  close(): void {
    this.db.close();
  }
}
