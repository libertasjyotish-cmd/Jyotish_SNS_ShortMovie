/**
 * Prints the stored fixed scripts of one language, so the wording that the pipeline will speak can
 * be read without opening the sheet.
 *
 * Usage: npm run dump:evergreen -- <lang> [--ids=a,b] [--json]
 *
 * --json prints the rows in the shape `rewrite:evergreen --from=` reads back, so a row can be
 * corrected by hand and written back through the same lint.
 */
import { GoogleSheetsService, type Language } from '@/services/sheets';
import { evergreenClosing } from '@/lib/evergreen-cta';

async function main() {
  const args = process.argv.slice(2);
  const lang = (args.find((arg) => !arg.startsWith('--')) ?? 'ja') as Language;
  const idArg = args.find((arg) => arg.startsWith('--ids='));
  const ids = idArg ? new Set(idArg.slice('--ids='.length).split(',')) : undefined;
  const asJson = args.includes('--json');

  const rows = (await new GoogleSheetsService().getEvergreenScripts(lang)).filter(
    (row) => !ids || ids.has(row.script_id),
  );
  if (asJson) {
    console.log(
      JSON.stringify(
        rows.map((row) => ({
          id: row.script_id,
          lang,
          hook: row.hook,
          body: row.body,
          cta: row.cta,
        })),
        null,
        2,
      ),
    );
    return;
  }

  console.log(`${lang}: ${rows.length} row(s)`);
  for (const row of rows) {
    console.log(`\n--- ${row.script_id}`);
    console.log(`hook: ${row.hook}`);
    console.log(`body: ${row.body}`);
    console.log(`cta : ${row.cta}`);
    console.log(`spoken cta: ${evergreenClosing(row.script_id, lang, row.cta)}`);
  }
}

void main();
