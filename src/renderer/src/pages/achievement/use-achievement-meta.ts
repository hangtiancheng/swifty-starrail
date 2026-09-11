import { useEffect, useState } from "react";
import { useTextMapStore } from "../../stores/text-map";
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

    const loadAchievementData = async (): Promise<void> => {
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
          getText(
            (item["AchievementDesc"] as Record<string, string>)["Hash"],
          ) ||
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
          achievementId: `${item["AchievementID"]}`,
          achievementVersion: (item["AchievementVersion"] as string) ?? "",
          achievementTitle: title,
          achievementDescUpper: desc.includes("※") ? desc.split("※")[0] : desc,
          achievementDescLower: desc.includes("※")
            ? "※" + desc.replace(/^.*?※/, "")
            : "",
          achievementShowType:
            item["ShowType"] === "ShowAfterFinish" ? "Hidden" : "",
          achievementReward: rarity.reward,
          achievementPriority: (item["Priority"] as number) ?? 0,
          achievementIcon:
            (seriesInfo?.["IconPath"] as string)
              ?.split("/")
              .at(-1)
              ?.replace("_s.png", `${rarity.icon}`) ?? "",
          seriesId: item["SeriesID"] as number,
          seriesPriority: (seriesInfo?.["Priority"] as number) ?? 0,
          achievementStatus: 1,
          achievementIsDisabled: false,
          achievementFinishDate: "",
          achievementFinishTime: "",
          achievementMutualExclusiveInfo: meMap[`${item["AchievementID"]}`]
            ? "Mutually exclusive achievements:\n" +
              meMap[`${item["AchievementID"]}`]
                .map(
                  (meId) =>
                    `  ${getText((achievementData[meId]?.["AchievementTitle"] as Record<string, string>)?.["Hash"])}`,
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

      let totalFix = 0;
      for (const c of Object.values(seriesCount)) {
        c.fix += c.ori;
        totalFix += c.fix;
      }

      const series: SeriesItem[] = [
        {
          seriesId: 0,
          seriesTitle: "All Achievements",
          seriesIcon: "Prize",
          seriesPriority: 999,
          countTotal: totalFix,
          countFinished: 0,
        },
      ];
      for (const s of Object.values(achievementSeries)) {
        series.push({
          seriesId: s["SeriesID"] as number,
          seriesTitle: getText(
            (s["SeriesTitle"] as Record<string, string>)["Hash"],
          ),
          seriesIcon:
            (s["MainIconPath"] as string)?.split("/").at(-1)?.split(".")[0] ??
            "",
          seriesPriority: (s["Priority"] as number) ?? 0,
          countTotal: seriesCount[s["SeriesID"] as number]?.fix ?? 0,
          countFinished: 0,
        });
      }
      series.sort((a, b) => b.seriesPriority - a.seriesPriority);
      setSeriesItems(series);
    };

    loadAchievementData();
  }, [textMap, getText]);

  return {
    achievementItems,
    seriesItems,
    meAchievementMap,
    achievementDataMap,
  };
}
