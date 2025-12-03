/**
 * Production-optimized image utilities for mobile crop disease detection
 * Includes compression, validation, quality assessment, and preprocessing
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export interface ImageQualityReport {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  brightness: number;
  contrast: number;
  sharpness: number;
}

const DEFAULT_OPTIONS: ImageCompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.85,
  maxSizeKB: 800,
};

// Minimum quality thresholds for accurate detection
const QUALITY_THRESHOLDS = {
  MIN_BRIGHTNESS: 30,
  MAX_BRIGHTNESS: 220,
  MIN_CONTRAST: 20,
  MIN_SHARPNESS: 15,
  MIN_QUALITY_SCORE: 40,
};

/**
 * Compress image with adaptive quality based on content
 */
export async function compressImage(
  imageDataUrl: string,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        let { width, height } = img;
        const maxWidth = opts.maxWidth!;
        const maxHeight = opts.maxHeight!;

        // Calculate optimal dimensions preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Ensure minimum dimensions for accurate detection
        const MIN_DIMENSION = 320;
        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
          const scale = MIN_DIMENSION / Math.min(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // High-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Adaptive quality compression
        let quality = opts.quality!;
        let result = canvas.toDataURL('image/jpeg', quality);

        // Iteratively reduce quality if over size limit
        const maxSizeBytes = (opts.maxSizeKB! * 1024 * 4) / 3;
        let iterations = 0;
        const MAX_ITERATIONS = 5;

        while (result.length > maxSizeBytes && quality > 0.4 && iterations < MAX_ITERATIONS) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
          iterations++;
        }

        console.log(`[ImageUtils] Compressed: ${width}x${height}, ${Math.round(result.length / 1024)}KB, quality: ${quality.toFixed(2)}`);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = imageDataUrl;
  });
}

/**
 * Analyze image quality for disease detection suitability
 */
export async function analyzeImageQuality(imageDataUrl: string): Promise<ImageQualityReport> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height, 400); // Sample at reduced size for performance
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(createDefaultQualityReport(false, ['Could not analyze image']));
        return;
      }
      
      // Draw centered crop of image
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      
      // Calculate image metrics
      const brightness = calculateBrightness(pixels);
      const contrast = calculateContrast(pixels, brightness);
      const sharpness = calculateSharpness(ctx, size);
      
      const issues: string[] = [];
      const recommendations: string[] = [];
      let score = 100;
      
      // Check brightness
      if (brightness < QUALITY_THRESHOLDS.MIN_BRIGHTNESS) {
        issues.push('Image is too dark');
        recommendations.push('Move to a well-lit area or use flash');
        score -= 25;
      } else if (brightness > QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
        issues.push('Image is overexposed');
        recommendations.push('Reduce lighting or avoid direct sunlight');
        score -= 20;
      }
      
      // Check contrast
      if (contrast < QUALITY_THRESHOLDS.MIN_CONTRAST) {
        issues.push('Low contrast - details may be hard to detect');
        recommendations.push('Ensure affected area is clearly visible');
        score -= 20;
      }
      
      // Check sharpness
      if (sharpness < QUALITY_THRESHOLDS.MIN_SHARPNESS) {
        issues.push('Image appears blurry');
        recommendations.push('Hold camera steady and tap to focus');
        score -= 30;
      }
      
      // Check resolution
      if (img.width < 400 || img.height < 400) {
        issues.push('Low resolution');
        recommendations.push('Move closer to the plant or use higher resolution');
        score -= 15;
      }
      
      score = Math.max(0, Math.min(100, score));
      
      resolve({
        isValid: score >= QUALITY_THRESHOLDS.MIN_QUALITY_SCORE,
        score,
        issues,
        recommendations,
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        sharpness: Math.round(sharpness),
      });
    };
    
    img.onerror = () => {
      resolve(createDefaultQualityReport(false, ['Failed to load image']));
    };
    
    img.src = imageDataUrl;
  });
}

function calculateBrightness(pixels: Uint8ClampedArray): number {
  let sum = 0;
  const pixelCount = pixels.length / 4;
  
  for (let i = 0; i < pixels.length; i += 4) {
    // Luminance formula
    sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }
  
  return sum / pixelCount;
}

function calculateContrast(pixels: Uint8ClampedArray, meanBrightness: number): number {
  let variance = 0;
  const pixelCount = pixels.length / 4;
  
  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    variance += Math.pow(brightness - meanBrightness, 2);
  }
  
  return Math.sqrt(variance / pixelCount);
}

function calculateSharpness(ctx: CanvasRenderingContext2D, size: number): number {
  // Laplacian variance method for sharpness detection
  const imageData = ctx.getImageData(0, 0, size, size);
  const gray = new Float32Array(size * size);
  
  // Convert to grayscale
  for (let i = 0; i < size * size; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
  }
  
  // Apply Laplacian filter
  let sum = 0;
  let count = 0;
  
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const laplacian = 
        -gray[idx - size - 1] - gray[idx - size] - gray[idx - size + 1] +
        -gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] +
        -gray[idx + size - 1] - gray[idx + size] - gray[idx + size + 1];
      
      sum += laplacian * laplacian;
      count++;
    }
  }
  
  return Math.sqrt(sum / count) / 10; // Normalize
}

function createDefaultQualityReport(isValid: boolean, issues: string[]): ImageQualityReport {
  return {
    isValid,
    score: isValid ? 50 : 0,
    issues,
    recommendations: [],
    brightness: 0,
    contrast: 0,
    sharpness: 0,
  };
}

/**
 * Validate image file before processing
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  
  if (!validTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Please use JPEG, PNG, or WebP images only' };
  }

  // Max 15MB raw file (will be compressed)
  if (file.size > 15 * 1024 * 1024) {
    return { valid: false, error: 'Image is too large. Please use an image under 15MB' };
  }

  // Min 10KB (likely corrupt if smaller)
  if (file.size < 10 * 1024) {
    return { valid: false, error: 'Image file appears to be corrupt or too small' };
  }

  return { valid: true };
}

/**
 * Enhanced image preprocessing for better AI detection
 */
export async function preprocessForDetection(
  imageDataUrl: string
): Promise<{ processedImage: string; metadata: { width: number; height: number; sizeKB: number } }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Target dimensions for optimal detection
        const TARGET_SIZE = 1024;
        let width = img.width;
        let height = img.height;
        
        // Scale to target while preserving aspect ratio
        const scale = Math.min(TARGET_SIZE / width, TARGET_SIZE / height, 1);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Apply subtle sharpening for better edge detection
        const imageData = ctx.getImageData(0, 0, width, height);
        const sharpened = applySharpenFilter(imageData);
        ctx.putImageData(sharpened, 0, 0);
        
        // Export as optimized JPEG
        const processedImage = canvas.toDataURL('image/jpeg', 0.9);
        const sizeKB = Math.round((processedImage.length * 3) / (4 * 1024));
        
        console.log(`[ImageUtils] Preprocessed: ${width}x${height}, ${sizeKB}KB`);
        
        resolve({
          processedImage,
          metadata: { width, height, sizeKB }
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
    img.src = imageDataUrl;
  });
}

function applySharpenFilter(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;
  
  // Unsharp mask kernel (subtle sharpening)
  const kernel = [
    0, -0.5, 0,
    -0.5, 3, -0.5,
    0, -0.5, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        outputData[idx] = Math.max(0, Math.min(255, Math.round(sum)));
      }
      outputData[(y * width + x) * 4 + 3] = 255; // Alpha
    }
  }
  
  // Copy edges unchanged
  for (let x = 0; x < width; x++) {
    copyPixel(data, outputData, x, width);
    copyPixel(data, outputData, (height - 1) * width + x, width);
  }
  for (let y = 0; y < height; y++) {
    copyPixel(data, outputData, y * width, width);
    copyPixel(data, outputData, y * width + width - 1, width);
  }
  
  return output;
}

function copyPixel(src: Uint8ClampedArray, dst: Uint8ClampedArray, idx: number, _width: number) {
  const i = idx * 4;
  dst[i] = src[i];
  dst[i + 1] = src[i + 1];
  dst[i + 2] = src[i + 2];
  dst[i + 3] = src[i + 3];
}

/**
 * Get estimated upload/processing time
 */
export function getEstimatedTime(imageSizeKB: number): string {
  // Based on average mobile connection speeds
  const seconds = Math.ceil(imageSizeKB / 100) + 3; // +3 for AI processing
  if (seconds < 5) return '~3-5 seconds';
  if (seconds < 10) return '~5-10 seconds';
  if (seconds < 20) return '~10-15 seconds';
  return '~15-20 seconds';
}

/**
 * Check if image is likely a plant/crop image (basic heuristic)
 */
export async function isLikelyPlantImage(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(true); // Assume valid if can't analyze
        return;
      }
      
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      
      // Count green-ish pixels (simple heuristic)
      let greenPixels = 0;
      const totalPixels = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Check if pixel has green tint (common in plants)
        if (g > r * 0.8 && g > b * 0.8 && g > 30) {
          greenPixels++;
        }
      }
      
      // If at least 10% green, likely a plant
      resolve(greenPixels / totalPixels > 0.1);
    };
    
    img.onerror = () => resolve(true);
    img.src = imageDataUrl;
  });
}
