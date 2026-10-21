import { toCanvas } from 'html-to-image';

const pageBackground = () => {
  const c = getComputedStyle(document.body).backgroundColor;
  return !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)' ? '#ffffff' : c;
};

/** Drop the empty rows the canvas has below the table (it is drawn a little taller than needed so nothing is cut off). */
function trimBottom(canvas, background) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const pctx = probe.getContext('2d');
  pctx.fillStyle = background;
  pctx.fillRect(0, 0, 1, 1);
  const bg = pctx.getImageData(0, 0, 1, 1).data;
  const same = (data, i) => Math.abs(data[i] - bg[0]) < 3 && Math.abs(data[i + 1] - bg[1]) < 3 && Math.abs(data[i + 2] - bg[2]) < 3;
  let last = height - 1;
  for (; last > 0; last--) {
    const row = ctx.getImageData(0, last, width, 1).data;
    let blank = true;
    for (let x = 0; x < width * 4; x += 16) {
      if (!same(row, x)) {
        blank = false;
        break;
      }
    }
    if (!blank) break;
  }
  const keep = Math.min(height, last + 3);
  if (keep >= height) return canvas;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = keep;
  out.getContext('2d').drawImage(canvas, 0, 0);
  return out;
}

/**
 * Render a table (all of it, whatever is hidden by scrolling, clipping or an animation around it) as a PNG and copy it to the
 * clipboard. The table is cloned off screen at its full width so the browser lays out every row, then drawn to a picture.
 * Where the browser cannot copy images the PNG is downloaded instead. Resolves to "copied" or "downloaded".
 */
export async function copyElementAsImage(el, filename = 'table.png') {
  const table = el.querySelector('table') ?? el;
  const width = Math.ceil(Math.max(table.offsetWidth, table.scrollWidth));
  const background = pageBackground();
  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  Object.assign(stage.style, { position: 'fixed', left: '-100000px', top: '0', width: `${width}px`, background, zIndex: '-1', pointerEvents: 'none' });
  const clone = table.cloneNode(true);
  clone.style.width = `${width}px`;
  clone.style.minWidth = `${width}px`;
  stage.appendChild(clone);
  document.body.appendChild(stage);
  let canvas;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    // the picture is drawn from a copy whose box keeps the height measured here, so give the box plenty of room: text can wrap a
    // little differently while it is drawn, and a fixed height would cut the last rows. The empty space is trimmed afterwards.
    const height = Math.ceil(stage.offsetHeight) + Math.ceil(stage.offsetHeight * 0.4) + 200;
    stage.style.height = `${height}px`;
    canvas = await toCanvas(stage, {
      width,
      height,
      pixelRatio: 2,
      backgroundColor: background,
      cacheBust: false,
      style: { left: '0', top: '0', position: 'static', zIndex: 'auto' },
    });
  } finally {
    stage.remove();
  }
  const blob = await new Promise((resolve) => trimBottom(canvas, background).toBlob(resolve, 'image/png'));
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
