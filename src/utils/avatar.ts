import { NODE_COLORS } from '../types';

/**
 * Get the first character of a name as initials.
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  return name.charAt(0);
}

/**
 * Simple string hash function.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get a deterministic color from NODE_COLORS based on the name hash.
 */
export function getAvatarColor(name: string): string {
  const index = hashString(name) % NODE_COLORS.length;
  return NODE_COLORS[index];
}

/**
 * Compress an image file to a target maximum size in KB.
 * Returns a base64 data URL string.
 */
export async function compressImage(
  file: File,
  maxSizeKB = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if the image is very large
        const maxDimension = 512;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // Binary search for quality that meets the size target
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        const maxBytes = maxSizeKB * 1024;

        // Estimate base64 → binary size
        const getByteSize = (base64: string) =>
          (base64.length * 3) / 4 -
          (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);

        let byteSize = getByteSize(dataUrl);

        if (byteSize > maxBytes) {
          let low = 0.1;
          let high = quality;
          for (let i = 0; i < 8; i++) {
            quality = (low + high) / 2;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            byteSize = getByteSize(dataUrl);
            if (byteSize > maxBytes) {
              high = quality;
            } else {
              low = quality;
            }
          }
          dataUrl = canvas.toDataURL('image/jpeg', low);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a default avatar as an SVG data URL.
 * Circular with background color based on name hash, white initials text.
 */
export function generateAvatarDataUrl(name: string): string {
  const initial = getInitials(name);
  const color = getAvatarColor(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="${color}" />
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="40" font-weight="600" fill="white">${initial}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
