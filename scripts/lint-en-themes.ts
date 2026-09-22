/** Lints the hand-written English theme scripts read from stdin as JSON lines. */
import { describeIssues, lintScript } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

async function main() {
  const input = await new Response(process.stdin as unknown as ReadableStream).text();
  let failed = 0;
  for (const line of input.split('\n').filter((row) => row.trim())) {
    const script = JSON.parse(line) as {
      id: string;
      hook: string;
      body: string;
      cta: string;
    };
    const words = `${script.hook} ${script.body} ${script.cta}`.trim().split(/\s+/).length;
    const issues = lintScript(
      { hook_text: script.hook, body_script: script.body, cta_text: script.cta },
      (process.argv[2] as Language) ?? 'en',
      '30s',
    );
    if (issues.length > 0) failed += 1;
    console.log(
      `${script.id} ${words}w: ${issues.length ? describeIssues(issues) : 'ok'}`,
    );
  }
  console.log(failed === 0 ? 'ALL OK' : `${failed} scripts with issues`);
}

void main();
