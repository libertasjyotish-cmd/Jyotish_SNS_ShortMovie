/**
 * Records, for rows rendered before the render stored its own background, which asset their
 * video was built on, so the cover drawn at post time lands on the same artwork.
 *
 * The pick is derived from the asset list, so a row rendered before new assets were registered
 * must be replayed against the list as it stood then: pass the assets added since with
 * `--exclude`, and when they were registered with `--rendered-before`, so rows rendered after
 * that keep the full list. Dry-run unless `--apply` is given.
 *
 * Usage: npm run backfill:render-backgrounds -- [--exclude=bg-58,bg-59]
 *   [--rendered-before=2026-10-08T12:00:00Z] [--apply]
 */
import { pickBackground } from "../src/lib/render";
import { GoogleSheetsService } from "../src/services/sheets";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const exclude = new Set(
    (args.find((arg) => arg.startsWith("--exclude="))?.split("=")[1] ?? "")
      .split(",")
      .filter(Boolean),
  );
  const renderedBefore = Date.parse(
    args.find((arg) => arg.startsWith("--rendered-before="))?.split("=")[1] ??
      "",
  );

  const sheets = new GoogleSheetsService();
  const tasks = (await sheets.getPendingPosts()).filter(
    (task) => task.day_of_week,
  );
  const backgrounds: { taskId: string; backgroundUrl: string }[] = [];

  for (const task of tasks) {
    const output = await sheets.getRenderOutput(task.task_id);
    if (!output?.video_url_30s || output.background_url) continue;

    const assets = (
      await sheets.getBackgroundAssets({
        lang_code: task.lang_code,
        day_of_week: task.day_of_week,
        pattern: "30s",
      })
    ).filter((asset) => {
      if (!exclude.has(asset.asset_id)) return true;
      const renderedAt = Date.parse(output.rendered_at ?? "");
      return (
        !(Number.isNaN(renderedBefore) || Number.isNaN(renderedAt)) &&
        renderedAt >= renderedBefore
      );
    });
    const siblings = (await sheets.getQueueTasks(task.week_id))
      .filter(
        (sibling) =>
          sibling.lang_code === task.lang_code &&
          sibling.day_of_week === task.day_of_week,
      )
      .map((sibling) => sibling.task_id);
    const backgroundUrl = pickBackground(
      task.task_id,
      assets,
      task.day_of_week,
      siblings,
    );
    if (!backgroundUrl) continue;

    console.log(`${task.task_id} -> ${backgroundUrl}`);
    backgrounds.push({ taskId: task.task_id, backgroundUrl });
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write.");
    return;
  }
  await sheets.saveRenderBackgrounds(backgrounds);
  console.log(`\nStored ${backgrounds.length} backgrounds.`);
}

void main();
