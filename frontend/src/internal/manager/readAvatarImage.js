/**
 * Crops an image file to a centred 160x160 JPEG data URL for use as an avatar.
 * Rejects with a user-facing Error message. (bundle: Ple)
 */
export function readAvatarImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error('That image is over 8 MB, please try a smaller one.'));
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 160;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Could not read that image.'));
      const side = Math.min(image.width, image.height);
      context.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        160,
        160,
      );
      URL.revokeObjectURL(image.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => reject(new Error('Could not read that image.'));
    image.src = URL.createObjectURL(file);
  });
}
