import { useEffect, useState } from "react";
import { useTextMapStore } from "../../stores/textmap-store";
import type { AchievementItem, SeriesItem } from "./types";

export function useAchievementMeta() {
  const getText = useTextMapStore((s) => s.getText);
  const textMap = useTextMapStore((s) => s.textMap);
  const [achievementItems, setAchievementItems] = useState<AchievementItem[]>(
    [],
  );
  const [seriesItems, setSeriesItems] = useState<SeriesItem[]>([]);
  const [meAchievementMap, setMeAchievementMap] = useState<
    Record<string, string[]>
  >({});
  const [achievementDataMap, setAchievementDataMap] = useState<
    Record<string, Record<string, unknown>>
  >({});

  useEffect(() => {
    if (!textMap) return;
    loadAchievementData();
  }, [textMap]);

  const loadAchievementData = async () => {
    const [
      achievementData,
      achievementSeries,
      achievementVersion,
      textReplaceMap,
      meAchievement,
    ] = (await Promise.all([
      window.api.invoke("static:loadJson", "AchievementData"),
      window.api.invoke("static:loadJson", "AchievementSeries"),
      window.api.invoke("static:loadJson", "AchievementVersion"),
      window.api.invoke("static:loadJson", "AchievementTextReplaceMap"),
      window.api.invoke("static:loadJson", "MutualExclusiveAchievement"),
    ])) as [
      Record<string, Record<string, unknown>>,
      Record<string, Record<string, unknown>>,
      Record<string, string[]>,
      Record<string, Record<string, string>>,
      string[][],
    ];

    setAchievementDataMap(achievementData);

    const meMap: Record<string, string[]> = {};
    (meAchievement as string[][]).forEach((group) => {
      group.forEach((id) => {
        meMap[id] = group;
      });
    });
    setMeAchievementMap(meMap);

    const rarityMap: Record<string, { icon: number; reward: number }> = {
      High: { icon: 1, reward: 20 },
      Mid: { icon: 2, reward: 10 },
      Low: { icon: 3, reward: 5 },
    };

    for (const [ver, ids] of Object.entries(achievementVersion)) {
      ids.forEach((aid) => {
        if (achievementData[aid])
          achievementData[aid]["AchievementVersion"] = ver;
      });
    }

    const items: AchievementItem[] = [];
    for (const item of Object.values(achievementData)) {
      let title = getText(
        (item["AchievementTitle"] as Record<string, string>)["Hash"],
      )
        .replaceAll("<unbreak>", "")
        .replaceAll("</unbreak>", "");

      let desc =
        getText((item["AchievementDesc"] as Record<string, string>)["Hash"]) ||
        getText(
          (item["HideAchievementDesc"] as Record<string, string>)["Hash"],
        );
      desc = desc
        .replaceAll("\\n", "")
        .replaceAll("<unbreak>", "")
        .replaceAll("</unbreak>", "")
        .replaceAll("</color>", "")
        .replaceAll(/<color=.*?>/g, "")
        .replaceAll("<u>", "")
        .replaceAll("</u>", "");

      const paramList = (item["ParamList"] as { Value: number }[]) ?? [];
      paramList.forEach((p, i) => {
        const idx = i + 1;
        desc = desc.replaceAll(`#${idx}[i]%`, `${p.Value * 100}%`);
        desc = desc.replaceAll(`#${idx}[i]`, `${p.Value}`);
        desc = desc.replaceAll(`#${idx}[m]`, `${p.Value}`);
        desc = desc.replaceAll(`#${idx}`, `${p.Value}`);
      });

      for (const [k, hash] of Object.entries(textReplaceMap)) {
        desc = desc.replaceAll(k, getText(hash["Hash"]));
        title = title.replaceAll(k, getText(hash["Hash"]));
      }

      const seriesInfo = achievementSeries[item["SeriesID"] as string];
      const rarity = rarityMap[(item["Rarity"] as string) ?? "Low"];

      items.push({
        achievement_id: `${item["AchievementID"]}`,
        achievement_version: (item["AchievementVersion"] as string) ?? "",
        achievement_title: title,
        achievement_desc_upper: desc.includes("※") ? desc.split("※")[0] : desc,
        achievement_desc_lower: desc.includes("※")
          ? "※" + desc.replace(/^.*?※/, "")
          : "",
        achievement_show_type:
          item["ShowType"] === "ShowAfterFinish" ? "隐藏" : "",
        achievement_reward: rarity.reward,
        achievement_priority: (item["Priority"] as number) ?? 0,
        achievement_icon:
          (seriesInfo?.["IconPath"] as string)
            ?.split("/")
            .at(-1)
            ?.replace("_s.png", `${rarity.icon}`) ?? "",
        series_id: item["SeriesID"] as number,
        series_priority: (seriesInfo?.["Priority"] as number) ?? 0,
        achievement_status: 1,
        achievement_is_disabled: false,
        achievement_finish_date: "",
        achievement_finish_time: "",
        achievement_mutual_exclusive_info: meMap[`${item["AchievementID"]}`]
          ? "互斥成就：\n" +
            meMap[`${item["AchievementID"]}`]
              .map(
                (meid) =>
                  `  ${getText((achievementData[meid]?.["AchievementTitle"] as Record<string, string>)?.["Hash"])}`,
              )
              .join("\n")
          : "",
      });
    }
    setAchievementItems(items);

    const seriesCount: Record<
      number,
      { ori: number; me: number; fix: number }
    > = {};
    for (const s of Object.values(achievementSeries)) {
      seriesCount[s["SeriesID"] as number] = { ori: 0, me: 0, fix: 0 };
    }
    for (const a of Object.values(achievementData)) {
      const sid = a["SeriesID"] as number;
      if (seriesCount[sid]) seriesCount[sid].ori++;
    }
    (meAchievement as string[][]).forEach((arr) => {
      const sid = achievementData[arr[0]]?.["SeriesID"] as number;
      if (seriesCount[sid]) {
        seriesCount[sid].me++;
        seriesCount[sid].fix -= arr.length - 1;
      }
    });

    let totalOri = 0;
    let totalFix = 0;
    for (const c of Object.values(seriesCount)) {
      c.fix += c.ori;
      totalOri += c.ori;
      totalFix += c.fix;
    }

    const series: SeriesItem[] = [
      {
        series_id: 0,
        series_title: "所有成就",
        series_icon: "Prize",
        series_priority: 999,
        count_total: totalFix,
        count_finished: 0,
      },
    ];
    for (const s of Object.values(achievementSeries)) {
      series.push({
        series_id: s["SeriesID"] as number,
        series_title: getText(
          (s["SeriesTitle"] as Record<string, string>)["Hash"],
        ),
        series_icon:
          (s["MainIconPath"] as string)?.split("/").at(-1)?.split(".")[0] ?? "",
        series_priority: (s["Priority"] as number) ?? 0,
        count_total: seriesCount[s["SeriesID"] as number]?.fix ?? 0,
        count_finished: 0,
      });
    }
    series.sort((a, b) => b.series_priority - a.series_priority);
    setSeriesItems(series);
  };

  return {
    achievementItems,
    seriesItems,
    meAchievementMap,
    achievementDataMap,
  };
}
