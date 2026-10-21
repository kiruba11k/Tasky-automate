import { toBlob } from 'html-to-image';

/**
 * Render `el` (all of it, including the part hidden by horizontal or vertical scrolling) as a PNG and copy it to the clipboard.
 * Where the browser cannot copy images the PNG is downloaded instead. Resolves to "copied" or "downloaded".
 */
export async function copyElementAsImage(el, filename = 'table.png') {
  const width = Math.ceil(el.scrollWidth);
  const height = Math.ceil(el.scrollHeight);
  const blob = await toBlob(el, {
    width,
    height,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    style: { overflow: 'visible', width: `${width}px`, maxHeight: 'none' },
  });
  if (!blob) throw new Error('Could not make the image.');
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copied';
    }
  } catch {
    /* fall through to the download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
