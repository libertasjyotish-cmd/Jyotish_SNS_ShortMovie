import { GeneratedScript } from "@/services/gemini";
import { Language } from "@/services/sheets";
import { splitBodyIntoSegments } from "./text";

/** Layout written in code so videos can be produced without the Creatomate editor. */
export interface LayoutOptions {
  script: GeneratedScript;
  /** Note printed under the CTA button, e.g. the "tap the profile link" line. */
  note?: string;
  language: Language;
  /** Background image or video; images get a slow zoom so the clip is not static. */
  backgroundUrl: string;
  backgroundType?: "image" | "video";
  voiceoverUrl: string;
  narrationSeconds: number;
  /** Seconds of video shown before the narration starts. */
  narrationStart: number;
  durationSeconds: number;
  maxBodySegments?: number;
}

const RTL_LANGUAGES: Language[] = ["ar"];
const FONT_BY_LANGUAGE: Record<Language, string> = {
  ja: "M PLUS 1p",
  en: "Montserrat",
  es: "Montserrat",
  pt: "Montserrat",
  id: "Montserrat",
  ar: "Noto Naskh Arabic",
};

interface SourceElement {
  [key: string]: unknown;
}

/**
 * Builds the Creatomate `source` for an intro-style clip: background, hook,
 * one body sentence at a time timed against the narration, CTA and note.
 */
export function buildIntroSource(
  options: LayoutOptions,
): Record<string, unknown> {
  const {
    script,
    note,
    language,
    backgroundUrl,
    voiceoverUrl,
    narrationSeconds,
    narrationStart,
    durationSeconds,
  } = options;
  const font = FONT_BY_LANGUAGE[language];
  const rtl = RTL_LANGUAGES.includes(language);
  const isVideo =
    (options.backgroundType ?? guessBackgroundType(backgroundUrl)) === "video";

  const elements: SourceElement[] = [
    isVideo
      ? {
          name: "Background",
          type: "video",
          track: 1,
          source: backgroundUrl,
          loop: true,
          volume: 0,
          duration: null,
        }
      : {
          name: "Background",
          type: "image",
          track: 1,
          source: backgroundUrl,
          duration: null,
          animations: [
            {
              type: "scale",
              scope: "element",
              fade: false,
              x_anchor: "50%",
              y_anchor: "50%",
              start_scale: "100%",
              end_scale: "108%",
              easing: "linear",
              duration: durationSeconds,
            },
          ],
        },
    {
      name: "Scrim",
      type: "shape",
      track: 2,
      x: "50%",
      y: "50%",
      width: "100%",
      height: "100%",
      path: "M 0 0 L 100 0 L 100 100 L 0 100 Z",
      fill_color: "rgba(0,0,0,0.35)",
      duration: null,
    },
    {
      name: "Hook-Text",
      type: "text",
      track: 3,
      text: script.hook_text,
      x: "50%",
      y: "33%",
      width: "78%",
      height: "14%",
      fill_color: "#ffffff",
      stroke_color: "#333333",
      stroke_width: "1.6 vmin",
      font_family: font,
      font_weight: "700",
      font_size_maximum: "7 vmin",
      x_alignment: "50%",
      y_alignment: "50%",
      ...(rtl ? { direction: "rtl" } : {}),
      animations: [{ type: "fade", time: 0, duration: 0.6 }],
    },
    ...bodyElements(options, font, rtl),
    {
      name: "CTA-Text",
      type: "text",
      track: 5,
      text: script.cta_text,
      x: "50%",
      y: "77%",
      width: "69%",
      height: "9.8%",
      text_wrap: false,
      fill_color: "#fff9f9",
      stroke_color: "#fccd18",
      stroke_width: "0.8 vmin",
      font_family: font,
      font_size_maximum: "4.4 vmin",
      x_alignment: "50%",
      y_alignment: "50%",
      ...(rtl ? { direction: "rtl" } : {}),
    },
    ...(note
      ? [
          {
            name: "Note-Text",
            type: "text",
            track: 6,
            text: note,
            x: "50%",
            y: "83%",
            width: "80%",
            height: "5%",
            fill_color: "#262218",
            font_family: font,
            font_size_maximum: "2.6 vmin",
            x_alignment: "50%",
            y_alignment: "50%",
            ...(rtl ? { direction: "rtl" } : {}),
          },
        ]
      : []),
    {
      name: "Voiceover",
      type: "audio",
      track: 7,
      source: voiceoverUrl,
      loop: false,
      time: narrationStart,
      duration: narrationSeconds || null,
    },
  ];

  return {
    width: 1080,
    height: 1920,
    output_format: "mp4",
    duration: durationSeconds,
    elements,
  };
}

/**
 * One element per sentence, each shown only while the narration reads it. The
 * narrator keeps a constant pace, so time is shared out by character count.
 */
function bodyElements(
  options: LayoutOptions,
  font: string,
  rtl: boolean,
): SourceElement[] {
  const { script, narrationSeconds, narrationStart } = options;
  const segments = splitBodyIntoSegments(
    script.body_script,
    options.maxBodySegments ?? 4,
  );
  const totalChars =
    script.hook_text.length +
      script.body_script.length +
      script.cta_text.length || 1;
  const secondsPerChar = narrationSeconds / totalChars;
  let cursor = narrationStart + script.hook_text.length * secondsPerChar;

  return segments.map((segment, index) => {
    const duration = segment.length * secondsPerChar;
    const element: SourceElement = {
      name: `Body-${index + 1}`,
      type: "text",
      track: 4,
      text: segment,
      time: Number(cursor.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      x: "50%",
      y: "55%",
      width: "75%",
      height: "30%",
      fill_color: "#fffbfb",
      stroke_color: "#333333",
      stroke_width: "1.5 vmin",
      font_family: font,
      font_size_maximum: "6 vmin",
      x_alignment: "50%",
      y_alignment: "50%",
      ...(rtl ? { direction: "rtl" } : {}),
      animations: [
        {
          type: "text-appear",
          split: "word",
          time: 0,
          duration: Math.min(1.2, duration / 2),
          easing: "quadratic-out",
        },
        { type: "fade", time: "end", duration: 0.4, reversed: true },
      ],
    };
    cursor += duration;
    return element;
  });
}

function guessBackgroundType(url: string): "image" | "video" {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) ? "video" : "image";
}
