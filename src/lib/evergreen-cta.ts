import { fixedCta } from '@/lib/fixed-cta';
import { isEventScriptId, isPromoScriptId } from '@/lib/schedule';
import { describeIssues, lintScript, type ScriptIssue } from '@/lib/script-lint';
import type { Language } from '@/services/sheets';

/** A product promotion sells one report, so it keeps its own closing instead of the shared one. */
export function isProductPromoId(script_id: string): boolean {
  return isPromoScriptId(script_id) && !isEventScriptId(script_id);
}

export function evergreenClosing(script_id: string, language: Language, cta: string): string {
  return isProductPromoId(script_id) ? cta : fixedCta(language);
}

/**
 * Checks a hand-written evergreen script the way the pipeline will speak it. The length budget
 * always assumes the shared closing, which a product promotion replaces with a shorter one of
 * its own; that closing is still checked for wording.
 */
export function lintEvergreenEntry(entry: {
  id: string;
  lang: Language;
  hook: string;
  body: string;
  cta: string;
}): ScriptIssue[] {
  const issues = lintScript(
    { hook_text: entry.hook, body_script: entry.body, cta_text: fixedCta(entry.lang) },
    entry.lang,
    '30s',
  );
  if (!isProductPromoId(entry.id)) return issues;

  const closing = lintScript(
    { hook_text: entry.hook, body_script: entry.body, cta_text: entry.cta },
    entry.lang,
    '30s',
  ).filter((issue) => issue.field === 'cta_text');
  return [...issues, ...closing];
}

export { describeIssues };
