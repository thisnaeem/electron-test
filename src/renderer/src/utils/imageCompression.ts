/**
 * Image compression utility for preparing images for Gemini API
 * Ensures images are under 4MB while maintaining quality
 */

export interface CompressionResult {
  compressedData: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

/**
 * Compresses an image to ensure it's under the specified size limit
 * @param imageData - Base64 image data with data URI prefix
 * @param maxSizeBytes - Maximum size in bytes (default: 4MB for Gemini)
 * @param quality - JPEG quality (0.1 to 1.0, default: 0.8)
 * @returns Promise<CompressionResult>
 */
export async function compressImageForGemini(
  imageData: string,
  maxSizeBytes: number = 4 * 1024 * 1024, // 4MB default
  quality: number = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    try {
      // Calculate original size
      const base64Data = imageData.split(',')[1]
      const originalSize = Math.round((base64Data.length * 3) / 4)

      // If already under limit, return as-is
      if (originalSize <= maxSizeBytes) {
        resolve({
          compressedData: imageData,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1
        })
        return
      }

      console.log(`🗜️ Image size ${Math.round(originalSize / 1024)}KB exceeds limit, compressing...`)

      // Create image element
      const img = new Image()
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Calculate new dimensions to reduce file size
          let { width, height } = img
          const aspectRatio = width / height

          // Start with a reasonable reduction if image is very large
          const maxDimension = 2048 // Max width or height
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              width = maxDimension
              height = width / aspectRatio
            } else {
              height = maxDimension
              width = height * aspectRatio
            }
          }

          // Set canvas dimensions
          canvas.width = width
          canvas.height = height

          // Draw image with high quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          // Function to try compression with different settings
          const tryCompression = (currentQuality: number, currentWidth: number, currentHeight: number): string | null => {
            canvas.width = currentWidth
            canvas.height = currentHeight
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight)
            
            // Try JPEG first (better compression)
            const jpegData = canvas.toDataURL('image/jpeg', currentQuality)
            const jpegSize = Math.round((jpegData.split(',')[1].length * 3) / 4)
            
            if (jpegSize <= maxSizeBytes) {
              return jpegData
            }

            // If JPEG still too large, try PNG with lower dimensions
            const pngData = canvas.toDataURL('image/png')
            const pngSize = Math.round((pngData.split(',')[1].length * 3) / 4)
            
            if (pngSize <= maxSizeBytes) {
              return pngData
            }

            return null
          }

          // Progressive compression strategy
          let compressedData: string | null = null
          let currentQuality = quality
          let currentWidth = width
          let currentHeight = height

          // Try different quality levels
          while (currentQuality >= 0.3 && !compressedData) {
            compressedData = tryCompression(currentQuality, currentWidth, currentHeight)
            if (!compressedData) {
              currentQuality -= 0.1
            }
          }

          // If still too large, reduce dimensions
          while (!compressedData && currentWidth > 512) {
            currentWidth = Math.round(currentWidth * 0.8)
            currentHeight = Math.round(currentHeight * 0.8)
            currentQuality = 0.8 // Reset quality when reducing dimensions
            
            while (currentQuality >= 0.3 && !compressedData) {
              compressedData = tryCompression(currentQuality, currentWidth, currentHeight)
              if (!compressedData) {
                currentQuality -= 0.1
              }
            }
          }

          if (!compressedData) {
            reject(new Error('Unable to compress image to required size'))
            return
          }

          const compressedSize = Math.round((compressedData.split(',')[1].length * 3) / 4)
          const compressionRatio = compressedSize / originalSize

          console.log(`✅ Compressed from ${Math.round(originalSize / 1024)}KB to ${Math.round(compressedSize / 1024)}KB (${Math.round(compressionRatio * 100)}%)`)

          resolve({
            compressedData,
            originalSize,
            compressedSize,
            compressionRatio
          })

        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'))
      }

      img.src = imageData
      
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Validates if an image is within size limits for Gemini API
 * @param imageData - Base64 image data with data URI prefix
 * @param maxSizeBytes - Maximum size in bytes (default: 4MB)
 * @returns boolean
 */
export function isImageWithinSizeLimit(
  imageData: string,
  maxSizeBytes: number = 4 * 1024 * 1024
): boolean {
  try {
    const base64Data = imageData.split(',')[1]
    const sizeBytes = Math.round((base64Data.length * 3) / 4)
    return sizeBytes <= maxSizeBytes
  } catch {
    return false
  }
}

/**
 * Gets the size of a base64 image in bytes
 * @param imageData - Base64 image data with data URI prefix
 * @returns number - Size in bytes
 */
export function getImageSize(imageData: string): number {
  try {
    const base64Data = imageData.split(',')[1]
    return Math.round((base64Data.length * 3) / 4)
  } catch {
    return 0
  }
}