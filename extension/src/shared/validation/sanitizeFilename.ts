export function sanitizeFilename(candidate: string): string {
  // eslint-disable-next-line no-control-regex
  const unsafeFilenameCharacters = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
  const cleaned = candidate
    .normalize('NFKC')
    .replace(unsafeFilenameCharacters, '_')
    .replace(/[. ]+$/g, '')
    .replace(/^\.+/g, '')
    .trim();
  const safeName = Array.from(cleaned).slice(0, 120).join('') || 'media-download';
  const stem = safeName.split('.')[0]?.toUpperCase();
  return stem && /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(stem) ? `_${safeName}` : safeName;
}
