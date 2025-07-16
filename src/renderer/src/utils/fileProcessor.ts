// File processing utilities for different media types

export interface ProcessedFileData {
  previewData: string
  fileType: 'image' | 'video' | 'vector'
  originalData?: string // For vector files
}

// Analyze frame content to determine if it has meaningful visual content
const analyzeFrameContent = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
  try {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    let totalBrightness = 0
    let colorVariance = 0
    let edgeCount = 0
    const sampleSize = Math.min(data.length / 4, 10000) // Sample pixels for performance
    const step = Math.floor((data.length / 4) / sampleSize)

    const brightnesses: number[] = []

    // Analyze brightness and color variance
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Calculate brightness (luminance)
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
      brightnesses.push(brightness)
      totalBrightness += brightness
    }

    const avgBrightness = totalBrightness / brightnesses.length

    // Calculate variance to detect uniform (black/white) frames
    for (const brightness of brightnesses) {
      colorVariance += Math.pow(brightness - avgBrightness, 2)
    }
    colorVariance = colorVariance / brightnesses.length

    // Detect edges (simple edge detection)
    const edgeThreshold = 30
    for (let i = 0; i < brightnesses.length - 1; i++) {
      if (Math.abs(brightnesses[i] - brightnesses[i + 1]) > edgeThreshold) {
        edgeCount++
      }
    }

    // Score the frame based on multiple factors
    let score = 0

    // Avoid too dark frames (likely black frames)
    if (avgBrightness > 20 && avgBrightness < 235) {
      score += 30
    }

    // Prefer frames with good color variance (not uniform)
    if (colorVariance > 100) {
      score += 40
    }

    // Prefer frames with edges (content detail)
    const edgeRatio = edgeCount / brightnesses.length
    if (edgeRatio > 0.1) {
      score += 30
    }

    console.log(`Frame analysis: brightness=${avgBrightness.toFixed(1)}, variance=${colorVariance.toFixed(1)}, edges=${edgeCount}, score=${score}`)

    return score
  } catch (error) {
    console.warn('Error analyzing frame content:', error)
    return 50 // Default score if analysis fails
  }
}

// Extract frame from video file using intelligent frame selection
export const extractVideoFrame = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    // Set video attributes for CSP compatibility
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.autoplay = false
    video.controls = false
    video.style.display = 'none'

    let frameExtracted = false
    let timeoutId: NodeJS.Timeout
    let currentFrameIndex = 0
    let bestFrame: { data: string; score: number } | null = null

    // Define frame positions to check (as percentages of video duration)
    const framePositions = [0.25, 0.5, 0.75, 0.1, 0.9, 0.33, 0.66] // Start with middle frames, then edges

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src)
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }

    const setupCanvas = () => {
      // Set canvas size to video dimensions (with max limits)
      const maxSize = 800
      let { videoWidth, videoHeight } = video

      // Fallback dimensions if video dimensions are not available
      if (!videoWidth || !videoHeight) {
        videoWidth = 640
        videoHeight = 480
      }

      if (videoWidth > videoHeight && videoWidth > maxSize) {
        videoHeight = (videoHeight * maxSize) / videoWidth
        videoWidth = maxSize
      } else if (videoHeight > maxSize) {
        videoWidth = (videoWidth * maxSize) / videoHeight
        videoHeight = maxSize
      }

      canvas.width = videoWidth
      canvas.height = videoHeight

      return { videoWidth, videoHeight }
    }

    const analyzeCurrentFrame = (): { data: string; score: number } => {
      const { videoWidth, videoHeight } = setupCanvas()

      // Draw the video frame to canvas
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

      // Analyze frame content
      const score = analyzeFrameContent(ctx, videoWidth, videoHeight)

      // Convert to data URL
      const frameData = canvas.toDataURL('image/jpeg', 0.8)

      return { data: frameData, score }
    }

    const checkNextFrame = () => {
      if (frameExtracted) return

      if (currentFrameIndex >= framePositions.length) {
        // We've checked all positions, return the best frame
        frameExtracted = true

        if (bestFrame) {
          console.log(`Selected best frame with score: ${bestFrame.score}`)
          cleanup()
          resolve(bestFrame.data)
        } else {
          // Fallback: return center frame even if not great
          video.currentTime = video.duration / 2
          setTimeout(() => {
            try {
              const fallbackFrame = analyzeCurrentFrame()
              cleanup()
              resolve(fallbackFrame.data)
            } catch (error) {
              cleanup()
              reject(new Error(`Failed to extract fallback frame: ${error instanceof Error ? error.message : 'Unknown error'}`))
            }
          }, 100)
        }
        return
      }

      // Move to next frame position
      const duration = video.duration
      if (duration > 0) {
        const position = framePositions[currentFrameIndex]
        video.currentTime = duration * position
        console.log(`Checking frame at ${(position * 100).toFixed(1)}% (${video.currentTime.toFixed(2)}s)`)
      } else {
        // If duration is not available, try fixed times
        video.currentTime = Math.min(currentFrameIndex + 1, 10)
      }

      currentFrameIndex++
    }

    // Event handlers
    video.onloadedmetadata = () => {
      console.log(`Video loaded: ${video.duration}s, ${video.videoWidth}x${video.videoHeight}`)

      // Start checking frames
      checkNextFrame()
    }

    video.onseeked = () => {
      console.log(`Video seeked to: ${video.currentTime}s`)

      // Small delay to ensure frame is ready, then analyze
      setTimeout(() => {
        if (frameExtracted) return

        try {
          const frameResult = analyzeCurrentFrame()

          // Keep track of the best frame so far
          if (!bestFrame || frameResult.score > bestFrame.score) {
            bestFrame = frameResult
            console.log(`New best frame found with score: ${frameResult.score}`)
          }

          // If we found a very good frame (score > 80), use it immediately
          if (frameResult.score > 80) {
            frameExtracted = true
            cleanup()
            resolve(frameResult.data)
            return
          }

          // Otherwise, continue checking more frames
          setTimeout(checkNextFrame, 50)
        } catch (error) {
          console.error('Error analyzing frame:', error)
          // Continue to next frame on error
          setTimeout(checkNextFrame, 50)
        }
      }, 100)
    }

    video.onloadeddata = () => {
      console.log('Video data loaded')
      // Fallback: if seeking doesn't work, start frame checking
      if (!frameExtracted && currentFrameIndex === 0) {
        setTimeout(checkNextFrame, 200)
      }
    }

    video.onerror = (e) => {
      console.error('Video error:', e)
      cleanup()
      reject(new Error('Failed to load video for frame extraction'))
    }

    // Set timeout to prevent hanging
    timeoutId = setTimeout(() => {
      if (!frameExtracted) {
        if (bestFrame) {
          console.log('Timeout reached, using best frame found')
          cleanup()
          resolve(bestFrame.data)
        } else {
          cleanup()
          reject(new Error('Video frame extraction timeout'))
        }
      }
    }, 30000) // Increased timeout for multiple frame analysis

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

    // Set timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (blobUrl) {
        console.warn('SVG conversion timeout, creating fallback...')
        cleanup()

        // Create fallback on timeout
        try {
          canvas.width = 400
          canvas.height = 400

          ctx.fillStyle = '#f3f4f6'
          ctx.fillRect(0, 0, 400, 400)

          ctx.fillStyle = '#6b7280'
          ctx.fillRect(80, 60, 240, 280)

          ctx.fillStyle = '#374151'
          ctx.font = 'bold 24px Arial'
          ctx.textAlign = 'center'
          ctx.fillText('SVG', 200, 220)
          ctx.font = '16px Arial'
          ctx.fillText('Timeout', 200, 250)

          const timeoutImageData = canvas.toDataURL('image/png', 1.0)
          resolve(timeoutImageData)
        } catch {
          reject(new Error('SVG conversion timeout and fallback failed'))
        }
      }
    }, 10000)

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

// Main file processor
export const processMediaFile = async (file: File): Promise<ProcessedFileData> => {
  const fileType = file.type
  const fileName = file.name.toLowerCase()

  try {
    // Handle images (existing logic)
    if (fileType.startsWith('image/')) {
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string)
          } else {
            reject(new Error('Failed to read image'))
          }
        }
        reader.onerror = () => reject(new Error('File read error'))
        reader.readAsDataURL(file)
      })

      return {
        previewData: imageData,
        fileType: 'image'
      }
    }

    // Handle videos
    if (fileType.startsWith('video/')) {
      const frameData = await extractVideoFrame(file)
      return {
        previewData: frameData,
        fileType: 'video'
      }
    }

    // Handle SVG
    if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
      console.log(`🎨 Processing SVG file: ${file.name}`)

      const svgContent = await new Promise<string>((resolve, reject) => {
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
      })

      try {
        const previewData = await convertSvgToImage(svgContent)

        // Validate the converted image
        const isValid = await validateConvertedImageData(previewData, file.name)

        if (!isValid) {
          console.warn(`⚠️ SVG conversion validation failed for ${file.name}, using fallback`)
          // Create a simple fallback image for invalid SVG conversions
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          if (ctx) {
            canvas.width = 400
            canvas.height = 400

            // Create fallback SVG icon
            ctx.fillStyle = '#f3f4f6'
            ctx.fillRect(0, 0, 400, 400)

            ctx.fillStyle = '#6b7280'
            ctx.fillRect(80, 60, 240, 280)

            ctx.fillStyle = '#9ca3af'
            ctx.beginPath()
            ctx.moveTo(260, 60)
            ctx.lineTo(320, 120)
            ctx.lineTo(260, 120)
            ctx.closePath()
            ctx.fill()

            ctx.fillStyle = '#374151'
            ctx.font = 'bold 24px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('SVG', 200, 200)
            ctx.font = '16px Arial'
            ctx.fillText('Conversion Failed', 200, 230)
            ctx.fillText('Using Fallback', 200, 250)

            const fallbackImageData = canvas.toDataURL('image/png', 1.0)

            return {
              previewData: fallbackImageData,
              fileType: 'vector',
              originalData: svgContent
            }
          }
        }

        console.log(`✅ SVG successfully converted and validated: ${file.name}`)
        return {
          previewData,
          fileType: 'vector',
          originalData: svgContent
        }
      } catch (svgError) {
        console.error(`❌ SVG conversion failed for ${file.name}:`, svgError)

        // Create a fallback image for failed SVG conversion
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          throw new Error(`Failed to process SVG ${file.name} and could not create fallback`)
        }

        canvas.width = 400
        canvas.height = 400

        // Create fallback error image
        ctx.fillStyle = '#fee2e2'
        ctx.fillRect(0, 0, 400, 400)

        ctx.fillStyle = '#dc2626'
        ctx.fillRect(80, 60, 240, 280)

        ctx.fillStyle = '#374151'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('SVG', 200, 190)
        ctx.font = '16px Arial'
        ctx.fillText('Processing Error', 200, 220)
        ctx.font = '12px Arial'
        ctx.fillText('File may be corrupted', 200, 240)

        const errorImageData = canvas.toDataURL('image/png', 1.0)

        return {
          previewData: errorImageData,
          fileType: 'vector',
          originalData: svgContent
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
  const maxVideoSize = 100 * 1024 * 1024 // 100MB for videos
  const maxVectorSize = 10 * 1024 * 1024 // 10MB for vectors

  if (isVideo && file.size > maxVideoSize) {
    return {
      isValid: false,
      error: `${file.name} is too large. Please use videos smaller than 100MB.`
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
