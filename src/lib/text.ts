/**
 * Puts each sentence on its own line so Creatomate's line-split text animation
 * reveals the body one sentence at a time.
 */
export function splitSentencesIntoLines(text: string): string {
  return splitSentences(text).join("\n");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。．.!?！？])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * Breaks the body into at most `max` chunks so each one can be shown in its own
 * template element. Sentences are the natural unit; overly long ones are cut at
 * a comma and, when there are too many, the shortest neighbours are merged.
 */
export function splitBodyIntoSegments(text: string, max: number): string[] {
  let segments = splitSentences(text);
  if (segments.length === 0) return [];

  while (segments.length < max) {
    const index = segments.findIndex(
      (segment) => segment.length > averageLength(segments) * 1.5,
    );
    const split = index === -1 ? null : splitAtComma(segments[index]);
    if (!split) break;
    segments = [
      ...segments.slice(0, index),
      ...split,
      ...segments.slice(index + 1),
    ];
  }

  while (segments.length > max) {
    let shortest = 0;
    for (let i = 1; i < segments.length - 1; i += 1) {
      if (
        segments[i].length + segments[i + 1].length <
        segments[shortest].length + segments[shortest + 1].length
      ) {
        shortest = i;
      }
    }
    segments = [
      ...segments.slice(0, shortest),
      `${segments[shortest]}${segments[shortest + 1]}`,
      ...segments.slice(shortest + 2),
    ];
  }

  return segments;
}

function averageLength(segments: string[]): number {
  return (
    segments.reduce((sum, segment) => sum + segment.length, 0) / segments.length
  );
}

function splitAtComma(sentence: string): [string, string] | null {
  const positions: number[] = [];
  for (let i = 0; i < sentence.length; i += 1) {
    if ("、,".includes(sentence[i])) positions.push(i);
  }
  if (positions.length === 0) return null;

  const middle = sentence.length / 2;
  const cut = positions.reduce((best, pos) =>
    Math.abs(pos - middle) < Math.abs(best - middle) ? pos : best,
  );
  const head = sentence.slice(0, cut + 1).trim();
  const tail = sentence.slice(cut + 1).trim();
  return head && tail ? [head, tail] : null;
}
