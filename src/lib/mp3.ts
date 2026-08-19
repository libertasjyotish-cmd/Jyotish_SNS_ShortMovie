const BITRATES_V1_L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
] as const;
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0] as const;
const SAMPLE_RATES: Record<number, readonly [number, number, number]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

/**
 * Length of an MP3 in seconds, summed frame by frame so both CBR and VBR
 * streams are handled. Returns 0 when no frame header can be found.
 */
export function mp3DurationSeconds(buffer: Buffer): number {
  let offset = skipId3(buffer);
  let duration = 0;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) {
      offset += 1;
      continue;
    }

    const versionBits = (buffer[offset + 1] >> 3) & 0x03;
    const layerBits = (buffer[offset + 1] >> 1) & 0x03;
    const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
    const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
    const padding = (buffer[offset + 2] >> 1) & 0x01;

    const sampleRates = SAMPLE_RATES[versionBits];
    if (layerBits !== 0x01 || !sampleRates || sampleRateIndex === 3 || bitrateIndex === 0) {
      offset += 1;
      continue;
    }

    const sampleRate = sampleRates[sampleRateIndex];
    const bitrate =
      (versionBits === 3 ? BITRATES_V1_L3[bitrateIndex] : BITRATES_V2_L3[bitrateIndex]) * 1000;
    if (!bitrate) {
      offset += 1;
      continue;
    }

    const samplesPerFrame = versionBits === 3 ? 1152 : 576;
    const frameLength = Math.floor((samplesPerFrame / 8) * (bitrate / sampleRate)) + padding;
    if (frameLength <= 0) {
      offset += 1;
      continue;
    }

    duration += samplesPerFrame / sampleRate;
    offset += frameLength;
  }

  return duration;
}

function skipId3(buffer: Buffer): number {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return 0;
  const size =
    (buffer[6] & 0x7f) * 0x200000 +
    (buffer[7] & 0x7f) * 0x4000 +
    (buffer[8] & 0x7f) * 0x80 +
    (buffer[9] & 0x7f);
  return 10 + size;
}
