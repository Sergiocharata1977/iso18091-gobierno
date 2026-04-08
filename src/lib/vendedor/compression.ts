// src/lib/vendedor/compression.ts
// Utilidades de compresión de imágenes para la App Vendedor

/**
 * Resultado de la compresión de foto
 */
export interface CompressionResult {
  blob: Blob;
  thumbnail: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Opciones de compresión
 */
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  thumbnailSize?: number;
  thumbnailQuality?: number;
}

const defaultOptions: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  thumbnailSize: 200,
  thumbnailQuality: 0.7,
};

/**
 * Comprime una foto para almacenamiento y transmisión eficiente
 */
export async function compressPhoto(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...defaultOptions, ...options };
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calcular dimensiones manteniendo aspect ratio
        let { width, height } = img;

        if (width > opts.maxWidth) {
          height = (height * opts.maxWidth) / width;
          width = opts.maxWidth;
        }

        if (height > opts.maxHeight) {
          width = (width * opts.maxHeight) / height;
          height = opts.maxHeight;
        }

        // Canvas para imagen principal
        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = width;
        mainCanvas.height = height;
        const mainCtx = mainCanvas.getContext('2d')!;

        // Aplicar corrección de orientación si es necesario
        mainCtx.drawImage(img, 0, 0, width, height);

        // Canvas para thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbRatio = opts.thumbnailSize / Math.max(width, height);
        thumbCanvas.width = width * thumbRatio;
        thumbCanvas.height = height * thumbRatio;
        const thumbCtx = thumbCanvas.getContext('2d')!;
        thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);

        // Convertir a blobs
        mainCanvas.toBlob(
          mainBlob => {
            if (!mainBlob) {
              reject(new Error('Error al comprimir imagen principal'));
              return;
            }

            thumbCanvas.toBlob(
              thumbBlob => {
                if (!thumbBlob) {
                  reject(new Error('Error al crear thumbnail'));
                  return;
                }

                resolve({
                  blob: mainBlob,
                  thumbnail: thumbBlob,
                  originalSize,
                  compressedSize: mainBlob.size,
                  compressionRatio: 1 - mainBlob.size / originalSize,
                });
              },
              'image/jpeg',
              opts.thumbnailQuality
            );
          },
          'image/jpeg',
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Obtiene la orientación EXIF de una imagen
 */
export async function getImageOrientation(file: File | Blob): Promise<number> {
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onload = e => {
      const view = new DataView(e.target?.result as ArrayBuffer);

      if (view.getUint16(0, false) !== 0xffd8) {
        resolve(1); // No es JPEG
        return;
      }

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xffe1) {
          if (view.getUint32((offset += 2), false) !== 0x45786966) {
            resolve(1);
            return;
          }

          const little = view.getUint16((offset += 6), false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;

          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, little));
              return;
            }
          }
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }

      resolve(1);
    };

    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

/**
 * Estima el tamaño de almacenamiento necesario para N fotos
 */
export function estimateStorageSize(
  photoCount: number,
  avgOriginalSizeKB: number = 3000,
  compressionRatio: number = 0.7
): {
  originalMB: number;
  compressedMB: number;
  thumbnailsMB: number;
  totalMB: number;
} {
  const originalMB = (photoCount * avgOriginalSizeKB) / 1024;
  const compressedMB = originalMB * (1 - compressionRatio);
  const thumbnailsMB = photoCount * 0.02; // ~20KB por thumbnail

  return {
    originalMB,
    compressedMB,
    thumbnailsMB,
    totalMB: compressedMB + thumbnailsMB,
  };
}
