import { PixelCrop } from 'react-image-crop';

export function getCroppedImage(image: HTMLImageElement, crop: PixelCrop): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return Promise.resolve(null);
    }

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;

    ctx.drawImage(
        image,
        cropX,
        cropY,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve) => {
        canvas.toBlob(blob => {
            resolve(blob);
        }, 'image/png', 1);
    });
}

export function rotateImage(imageBase64: string, rotation: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageBase64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      const rads = (rotation * Math.PI) / 180;
      const absRads = Math.abs(rads);
      
      // Calculate the new bounding box of the rotated image
      const newWidth = Math.abs(img.width * Math.cos(rads)) + Math.abs(img.height * Math.sin(rads));
      const newHeight = Math.abs(img.height * Math.cos(rads)) + Math.abs(img.width * Math.sin(rads));

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Translate context to center of canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      // Rotate context
      ctx.rotate(rads);
      // Draw image centered on the canvas
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (error) => reject(error);
  });
}
