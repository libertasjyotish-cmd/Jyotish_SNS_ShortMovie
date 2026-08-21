/**
 * Puts each sentence on its own line so Creatomate's line-split text animation
 * reveals the body one sentence at a time.
 */
export function splitSentencesIntoLines(text: string): string {
  return text
    .split(/(?<=[。．.!?！？])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join('\n');
}
