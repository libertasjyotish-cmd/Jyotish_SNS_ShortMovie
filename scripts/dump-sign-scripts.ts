/**
 * Prints the stored script of one zodiac sign for a week in every language, so a complaint about a
 * published video can be checked against what was actually written.
 *
 * Usage: npm run dump:sign -- <Sign> [week_id]
 */
import { GoogleSheetsService } from '@/services/sheets';
import { isoWeekId } from '@/lib/schedule';

async function main() {
  const sign = (process.argv[2] ?? 'Cancer').toLowerCase();
  const sheets = new GoogleSheetsService();
  const weekId = process.argv[3] ?? isoWeekId(new Date());
  const outputs = await sheets.getScriptOutputsByWeek(weekId);
  const matches = outputs.filter((output) => (output.zodiac_sign ?? '').toLowerCase() === sign);
  console.log(`${weekId} ${sign}: ${matches.length} row(s)`);
  for (const output of matches) {
    console.log(`\n--- ${output.lang_code} ${output.task_id}`);
    console.log(output.script_30s_json);
  }
}

void main();
