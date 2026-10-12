import { Wr as isWorkday, $e as dayKey, ia as nextWorkday } from '@/internal/min';

/** Emoji badges a person can pick on the Profile page. (Sle) */
export const BADGE_EMOJIS = ['🚀', '⭐', '🔥', '🎯', '💡', '🌱', '☕', '🎧', '🏆', '🦉'];

/** Accent colour choices on the Profile page. (Nle) */
export const ACCENT_OPTIONS = [
  { id: 'brand', label: 'Lead Strategus', swatch: '#1D3FA0' },
  { id: 'sky', label: 'Sky', swatch: '#2563A8' },
  { id: 'mint', label: 'Mint', swatch: '#1A7F5A' },
  { id: 'lavender', label: 'Lavender', swatch: '#6D4FD1' },
  { id: 'peach', label: 'Peach', swatch: '#B04E24' },
  { id: 'butter', label: 'Butter', swatch: '#856300' },
];

/** Reads an image file and returns a 160x160 centre-cropped JPEG data URL. (Ple) */
export function readProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please choose an image file.'));
    }
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error('That image is over 8 MB, please try a smaller one.'));
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not read that image.'));
      const side = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        160,
        160,
      );
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = URL.createObjectURL(file);
  });
}

/** Today if it is a working day, otherwise the next working day. (jp) */
export const todayOrNextWorkday = () =>
  isWorkday(dayKey(0)) ? dayKey(0) : nextWorkday(dayKey(0));
