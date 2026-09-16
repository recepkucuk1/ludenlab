export const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

/** `frame` anında yanmış kelime sayısı; kelimeler `captionFrames` boyunca eşit aralıkla yanar. */
export function visibleWordCount(wordCount: number, frame: number, captionFrames: number): number {
  if (frame < 0) return 0;
  if (captionFrames <= 0) return wordCount;
  return Math.min(wordCount, Math.floor((frame * wordCount) / captionFrames) + 1);
}
