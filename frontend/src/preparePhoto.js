import { fitPhoto, photoInputError } from './photoPolicy.mjs';

export async function preparePhoto(file, { maxSide = 2048, maxLength = 600_000 } = {}) {
  const problem = photoInputError(file);
  if (problem) throw new Error(problem);
  let image;
  let objectUrl;
  const canvas = document.createElement('canvas');
  try {
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    else {
      objectUrl = URL.createObjectURL(file);
      image = await new Promise((resolve, reject) => {
        const picture = new Image();
        picture.onload = () => resolve(picture);
        picture.onerror = () => reject(new Error('decode'));
        picture.src = objectUrl;
      });
    }
    const dimensions = fitPhoto(image.width, image.height, maxSide);
    let sideScale = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('decode');
    // Process sequentially and release decoded pixels after each file.
    for (let round = 0; round < 4; round += 1) {
      canvas.width = Math.max(1, Math.round(dimensions.width * sideScale));
      canvas.height = Math.max(1, Math.round(dimensions.height * sideScale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [.86, .76, .64]) {
        const encoded = canvas.toDataURL('image/webp', quality);
        if (encoded.length <= maxLength) return encoded;
      }
      sideScale *= .75;
    }
    throw new Error('decode');
  } catch (error) {
    throw new Error(['dimensions', 'size', 'format'].includes(error.message) ? error.message : 'decode');
  } finally {
    image?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    canvas.width = 1; canvas.height = 1;
  }
}
