// File processing utilities for different media types

export interface ProcessedFileData {
  previewData: string
  fileType: 'image' | 'video' | 'vector'
  originalData?: string // For vector files
}

// Removed complex frame analysis for faster processing

// Extract frame from video file optimized for low-end PCs
export const extractVideoFrame = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size - skip very large videos
    if (file.size > 1024 * 1024 * 1024) { // 1GB limit
      reject(new Error('Video file too large for processing'))
      return
    }

    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    // Set video attributes for CSP compatibility and low-end PC optimization
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata' // Only load metadata, not full video
    video.autoplay = false
    video.controls = false
    video.style.display = 'none'
    video.volume = 0 // Ensure no audio processing

    let frameExtracted = false
    let timeoutId: NodeJS.Timeout

    // Extract single frame at 25% position for speed

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src)
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }

    const extractFrame = () => {
      if (frameExtracted) return

      try {
        // Set canvas size to video dimensions (with aggressive limits for low-end PCs)
        const maxSize = 400 // Further reduced for low-end PCs
        let { videoWidth, videoHeight } = video

        // Fallback dimensions if video dimensions are not available
        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
          videoWidth = 400
          videoHeight = 300
        }

        // Ensure reasonable dimensions
        if (videoWidth > videoHeight && videoWidth > maxSize) {
          videoHeight = Math.floor((videoHeight * maxSize) / videoWidth)
          videoWidth = maxSize
        } else if (videoHeight > maxSize) {
          videoWidth = Math.floor((videoWidth * maxSize) / videoHeight)
          videoHeight = maxSize
        }

        // Minimum size check
        if (videoWidth < 100) videoWidth = 100
        if (videoHeight < 100) videoHeight = 100

        canvas.width = videoWidth
        canvas.height = videoHeight

        // Clear canvas first
        ctx.clearRect(0, 0, videoWidth, videoHeight)

        // Draw the video frame to canvas with error handling
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

        // Convert to data URL with lower quality for speed and smaller memory footprint
        const frameData = canvas.toDataURL('image/jpeg', 0.6)

        frameExtracted = true
        cleanup()
        resolve(frameData)
      } catch (error) {
        cleanup()
        reject(new Error(`Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    // Event handlers
    video.onloadedmetadata = () => {
      // Seek to 25% of video duration for a good representative frame
      const seekTime = video.duration > 0 ? video.duration * 0.25 : 1
      video.currentTime = seekTime
    }

    video.onseeked = () => {
      // Small delay to ensure frame is ready, then extract
      setTimeout(() => {
        if (!frameExtracted) {
          try {
            extractFrame()
          } catch (error) {
            cleanup()
            reject(new Error(`Failed to extract frame: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        }
      }, 50)
    }

    video.onloadeddata = () => {
      // Fallback: if seeking doesn't work, extract current frame
      if (!frameExtracted) {
        setTimeout(() => {
          if (!frameExtracted) {
            try {
              extractFrame()
            } catch (error) {
              cleanup()
              reject(new Error(`Failed to extract fallback frame: ${error instanceof Error ? error.message : 'Unknown error'}`))
            }
          }
        }, 100)
      }
    }

    video.onerror = (e) => {
      console.error('Video error:', e)
      cleanup()
      reject(new Error('Failed to load video for frame extraction'))
    }

    // Set aggressive timeout to prevent hanging on low-end PCs
    timeoutId = setTimeout(() => {
      if (!frameExtracted) {
        cleanup()
        reject(new Error('Video frame extraction timeout - file may be corrupted or too complex'))
      }
    }, 3000) // Very short timeout for low-end PCs

    // Add video to DOM temporarily for processing
    document.body.appendChild(video)

    // Use blob URL for CSP compatibility
    try {
      const blobUrl = URL.createObjectURL(file)
      video.src = blobUrl
      video.load()
    } catch (error) {
      cleanup()
      reject(new Error(`Failed to create blob URL: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

// Convert SVG to preview image
export const convertSvgToImage = (svgContent: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    let blobUrl: string | null = null

    const cleanup = () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        blobUrl = null
      }
    }

    img.onload = () => {
      try {
        console.log(`SVG loaded successfully. Dimensions: ${img.naturalWidth}x${img.naturalHeight}`)

        // Set reasonable canvas size with fallback
        const maxSize = 800
        let width = img.naturalWidth || img.width || 400
        let height = img.naturalHeight || img.height || 400

        // Fallback for invalid dimensions
        if (width === 0 || height === 0 || !isFinite(width) || !isFinite(height)) {
          console.warn('SVG has invalid dimensions, using fallback 400x400')
          width = 400
          height = 400
        }

        // Ensure minimum size
        if (width < 10) width = 400
        if (height < 10) height = 400

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }

        console.log(`Canvas dimensions set to: ${width}x${height}`)

        canvas.width = width
        canvas.height = height

        // Fill with white background to ensure no transparency issues
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)

        // Draw SVG with error handling
        try {
          ctx.drawImage(img, 0, 0, width, height)
        } catch (drawError) {
          console.error('Error drawing SVG to canvas:', drawError)
          // Create a fallback image with text
          ctx.fillStyle = '#666666'
          ctx.font = '16px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('SVG File', width / 2, height / 2)
        }

        // Convert to data URL with higher quality and validation
        let imageData: string
        try {
          imageData = canvas.toDataURL('image/png', 1.0) // Use PNG for better quality and compatibility
        } catch (toDataURLError) {
          console.error('Error converting canvas to data URL:', toDataURLError)
          reject(new Error('Failed to convert SVG to image data'))
          return
        }

        // Validate the generated image data
        if (!imageData || !imageData.startsWith('data:image/') || imageData.length < 100) {
          console.error('Generated invalid image data for SVG')
          reject(new Error('Generated invalid image data for SVG'))
          return
        }

        console.log('SVG successfully converted to image data, length:', imageData.length, 'format: PNG')
        cleanup()
        resolve(imageData)
      } catch (error) {
        console.error('Error processing SVG in onload:', error)
        cleanup()
        reject(new Error(`Failed to process SVG: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    img.onerror = (e) => {
      console.error('SVG conversion error:', e)
      cleanup()

      // Try to create a fallback image instead of failing completely
      try {
        console.log('Creating fallback SVG image...')
        canvas.width = 400
        canvas.height = 400

        // Create a simple fallback image
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, 400, 400)

        // Draw SVG file icon
        ctx.fillStyle = '#6b7280'
        ctx.fillRect(80, 60, 240, 280)

        // Draw corner fold
        ctx.fillStyle = '#9ca3af'
        ctx.beginPath()
        ctx.moveTo(260, 60)
        ctx.lineTo(320, 120)
        ctx.lineTo(260, 120)
        ctx.closePath()
        ctx.fill()

        // Add SVG text
        ctx.fillStyle = '#374151'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('SVG', 200, 220)
        ctx.font = '16px Arial'
        ctx.fillText('Vector File', 200, 250)

        const fallbackImageData = canvas.toDataURL('image/png', 1.0)
        console.log('Fallback SVG image created successfully')
        resolve(fallbackImageData)
      } catch (fallbackError) {
        console.error('Failed to create fallback SVG image:', fallbackError)
        reject(new Error('Failed to convert SVG - invalid SVG content and fallback creation failed'))
      }
    }

    // Set timeout to prevent hanging - reduced for faster processing
    const timeoutId = setTimeout(() => {
      if (blobUrl) {
        cleanup()
        reject(new Error('SVG conversion timeout'))
      }
    }, 3000) // Reduced timeout from 10s to 3s

    try {
      // Clean and validate SVG content
      let cleanSvgContent = svgContent.trim()
      console.log('Processing SVG content, length:', cleanSvgContent.length)

      if (!cleanSvgContent) {
        clearTimeout(timeoutId)
        reject(new Error('Empty SVG content'))
        return
      }

      // More robust SVG validation
      if (!cleanSvgContent.includes('<svg') && !cleanSvgContent.toLowerCase().includes('<svg')) {
        console.error('SVG validation failed: does not contain <svg>')
        clearTimeout(timeoutId)
        cleanup()
        reject(new Error('Invalid SVG: does not contain <svg element'))
        return
      }

      // Remove any problematic characters and ensure proper encoding
      cleanSvgContent = cleanSvgContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

      // Ensure SVG has proper namespace if missing
      if (!cleanSvgContent.includes('xmlns')) {
        cleanSvgContent = cleanSvgContent.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
        console.log('Added XML namespace to SVG')
      }

      // Add viewBox if missing (helps with scaling)
      if (!cleanSvgContent.includes('viewBox')) {
        // Try to extract width/height for viewBox
        const widthMatch = cleanSvgContent.match(/width\s*=\s*["']?([^"'\s>]+)/i)
        const heightMatch = cleanSvgContent.match(/height\s*=\s*["']?([^"'\s>]+)/i)

        if (widthMatch && heightMatch) {
          const width = parseFloat(widthMatch[1]) || 400
          const height = parseFloat(heightMatch[1]) || 400
          cleanSvgContent = cleanSvgContent.replace(/<svg/i, `<svg viewBox="0 0 ${width} ${height}"`)
          console.log('Added viewBox to SVG')
        }
      }

      // Add width and height if missing for better rendering
      if (!cleanSvgContent.includes('width=') && !cleanSvgContent.includes('height=')) {
        cleanSvgContent = cleanSvgContent.replace(/<svg/i, '<svg width="400" height="400"')
        console.log('Added default dimensions to SVG')
      }

      console.log('Creating blob for SVG conversion...')
      // Create blob URL for SVG with proper MIME type
      const blob = new Blob([cleanSvgContent], { type: 'image/svg+xml;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)

      // Clear the timeout when we successfully create the blob
      clearTimeout(timeoutId)

      img.src = blobUrl
      console.log('SVG blob created and assigned to image element')
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error creating SVG blob:', error)
      cleanup()
      reject(new Error(`Failed to create SVG blob: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

// Convert EPS to preview (simplified - shows file icon)
export const convertEpsToPreview = (): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      resolve('')
      return
    }

    canvas.width = 400
    canvas.height = 400

    // Create a simple EPS file icon
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, 400, 400)

    // Draw file icon
    ctx.fillStyle = '#6b7280'
    ctx.fillRect(80, 60, 240, 280)

    // Draw corner fold
    ctx.fillStyle = '#9ca3af'
    ctx.beginPath()
    ctx.moveTo(260, 60)
    ctx.lineTo(320, 120)
    ctx.lineTo(260, 120)
    ctx.closePath()
    ctx.fill()

    // Add EPS text
    ctx.fillStyle = '#374151'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('EPS', 200, 220)
    ctx.font = '16px Arial'
    ctx.fillText('Vector File', 200, 250)

    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    resolve(imageData)
  })
}

// Validate converted image data quality
export const validateConvertedImageData = (imageData: string, originalFilename: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (!imageData || !imageData.startsWith('data:image/')) {
        console.error(`❌ Invalid image data format for ${originalFilename}`)
        resolve(false)
        return
      }

      // Test if the image can be loaded
      const img = new Image()
      let resolved = false

      const handleLoad = () => {
        if (resolved) return
        resolved = true

        const isValid = img.naturalWidth > 0 && img.naturalHeight > 0
        console.log(`✅ Image validation for ${originalFilename}: ${isValid ? 'PASSED' : 'FAILED'} (${img.naturalWidth}x${img.naturalHeight})`)
        resolve(isValid)
      }

      const handleError = () => {
        if (resolved) return
        resolved = true

        console.error(`❌ Image validation failed for ${originalFilename}: Image could not be loaded`)
        resolve(false)
      }

      img.onload = handleLoad
      img.onerror = handleError

      // Set a timeout for validation
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.warn(`⚠️ Image validation timeout for ${originalFilename}`)
          resolve(false)
        }
      }, 5000)

      img.src = imageData
    } catch (error) {
      console.error(`❌ Image validation error for ${originalFilename}:`, error)
      resolve(false)
    }
  })
}

// Main file processor optimized for low-end PCs
export const processMediaFile = async (file: File): Promise<ProcessedFileData> => {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  try {
    // Handle images with memory optimization
    if (fileType.startsWith('image/')) {
      // For very large images on low-end PCs, use lower quality reading
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        
        // Set timeout to prevent hanging on corrupted files
        const timeout = setTimeout(() => {
          reader.abort()
          reject(new Error('Image read timeout - file may be corrupted'))
        }, 10000) // 10 second timeout
        
        reader.onload = (e) => {
          clearTimeout(timeout)
          if (e.target?.result) {
            resolve(e.target.result as string)
          } else {
            reject(new Error('Failed to read image'))
          }
        }
        
        reader.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('File read error'))
        }
        
        reader.onabort = () => {
          clearTimeout(timeout)
          reject(new Error('File read aborted'))
        }
        
        reader.readAsDataURL(file)
      })

      return {
        previewData: imageData,
        fileType: 'image'
      }
    }

    // Handle videos with timeout protection
    if (fileType.startsWith('video/')) {
      try {
        const frameData = await Promise.race([
          extractVideoFrame(file),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Video processing timeout')), 8000)
          )
        ])
        return {
          previewData: frameData,
          fileType: 'video'
        }
      } catch (videoError) {
        console.warn(`Video processing failed for ${file.name}, creating fallback`)
        // Create a simple video placeholder instead of failing
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          canvas.width = 400
          canvas.height = 300
          
          // Create video placeholder
          ctx.fillStyle = '#1f2937'
          ctx.fillRect(0, 0, 400, 300)
          
          // Play button
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.moveTo(160, 120)
          ctx.lineTo(160, 180)
          ctx.lineTo(220, 150)
          ctx.closePath()
          ctx.fill()
          
          // Video text
          ctx.fillStyle = '#9ca3af'
          ctx.font = '16px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('Video File', 200, 220)
          ctx.fillText('Preview Unavailable', 200, 240)
          
          const fallbackData = canvas.toDataURL('image/jpeg', 0.8)
          return {
            previewData: fallbackData,
            fileType: 'video'
          }
        }
        
        throw videoError
      }
    }

    // Handle SVG with enhanced error handling for low-end PCs
    if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
      console.log(`🎨 Processing SVG file: ${file.name}`)

      try {
        const svgContent = await Promise.race([
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              if (e.target?.result) {
                resolve(e.target.result as string)
              } else {
                reject(new Error('Failed to read SVG'))
              }
            }
            reader.onerror = () => reject(new Error('SVG read error'))
            reader.readAsText(file)
          }),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('SVG read timeout')), 5000)
          )
        ])

        const previewData = await Promise.race([
          convertSvgToImage(svgContent),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('SVG conversion timeout')), 4000)
          )
        ])

        console.log(`✅ SVG successfully converted: ${file.name}`)
        return {
          previewData,
          fileType: 'vector',
          originalData: svgContent
        }
      } catch (svgError) {
        console.warn(`⚠️ SVG processing failed for ${file.name}, creating simple fallback`)

        // Create a simple fallback image for failed SVG conversion
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error(`Failed to process SVG ${file.name} and could not create fallback`)
        }

        canvas.width = 300 // Smaller for low-end PCs
        canvas.height = 300

        // Simple SVG icon
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, 300, 300)

        ctx.fillStyle = '#6b7280'
        ctx.fillRect(60, 45, 180, 210)

        ctx.fillStyle = '#374151'
        ctx.font = 'bold 18px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('SVG', 150, 160)
        ctx.font = '14px Arial'
        ctx.fillText('Vector File', 150, 180)

        const fallbackImageData = canvas.toDataURL('image/jpeg', 0.8) // Use JPEG for smaller size

        return {
          previewData: fallbackImageData,
          fileType: 'vector',
          originalData: svgError instanceof Error ? svgError.message : 'SVG processing failed'
        }
      }
    }

    // Handle EPS
    if (fileName.endsWith('.eps')) {
      const previewData = await convertEpsToPreview()

      // Read EPS content as text for metadata generation
      const epsContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string)
          } else {
            reject(new Error('Failed to read EPS'))
          }
        }
        reader.onerror = () => reject(new Error('EPS read error'))
        reader.readAsText(file)
      })

      return {
        previewData,
        fileType: 'vector',
        originalData: epsContent
      }
    }

    throw new Error('Unsupported file type')

  } catch (error) {
    throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// File validation
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const fileName = file.name.toLowerCase()
  const fileType = file.type

  // Check file types
  const isImage = fileType.startsWith('image/') &&
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(fileType)
  const isVideo = fileType.startsWith('video/') &&
    ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'].includes(fileType)
  const isSvg = fileType === 'image/svg+xml' || fileName.endsWith('.svg')
  const isEps = fileName.endsWith('.eps')

  if (!isImage && !isVideo && !isSvg && !isEps) {
    return {
      isValid: false,
      error: `${file.name} is not a supported format. Please use JPEG, PNG, GIF, WebP, SVG, EPS, or video files.`
    }
  }

  // Check file sizes
  const maxImageSize = 50 * 1024 * 1024 // 50MB for images
  const maxVideoSize = 1024 * 1024 * 1024 // 1GB for videos
  const maxVectorSize = 10 * 1024 * 1024 // 10MB for vectors

  if (isVideo && file.size > maxVideoSize) {
    return {
      isValid: false,
      error: `${file.name} is too large. Please use videos smaller than 1GB.`
    }
  }

  if ((isImage || isSvg || isEps) && file.size > (isSvg || isEps ? maxVectorSize : maxImageSize)) {
    const limit = isSvg || isEps ? '10MB' : '50MB'
    return {
      isValid: false,
      error: `${file.name} is too large. Please use files smaller than ${limit}.`
    }
  }

  return { isValid: true }
}
