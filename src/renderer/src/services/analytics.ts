declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date | any,
      config?: any
    ) => void
  }
}

class GoogleAnalytics {
  private measurementId: string
  private isInitialized = false
  private isEnabled = true

  constructor(measurementId: string) {
    this.measurementId = measurementId
  }

  // Initialize Google Analytics
  init() {
    if (this.isInitialized || !this.measurementId) return

    try {
      // Create and append gtag script
      const script1 = document.createElement('script')
      script1.async = true
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`
      document.head.appendChild(script1)

      // Initialize gtag
      const script2 = document.createElement('script')
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${this.measurementId}', {
          page_title: 'Electron App',
          page_location: 'electron://renderer/',
          anonymize_ip: true
        });
      `
      document.head.appendChild(script2)

      // Set global gtag function
      window.gtag = window.gtag || function() {
        (window as any).dataLayer = (window as any).dataLayer || []
        ;(window as any).dataLayer.push(arguments)
      }

      this.isInitialized = true
      console.log('📊 Google Analytics initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Google Analytics:', error)
    }
  }

  // Track page views
  trackPageView(pageName: string) {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: `electron://renderer/${pageName.toLowerCase()}`,
        custom_map: {
          dimension1: 'electron_app'
        }
      })
      console.log(`📊 Page view tracked: ${pageName}`)
    } catch (error) {
      console.error('❌ Failed to track page view:', error)
    }
  }

  // Track events
  trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isEnabled || !this.isInitialized) return

    try {
      window.gtag('event', eventName, {
        event_category: 'electron_app',
        ...parameters
      })
      console.log(`📊 Event tracked: ${eventName}`, parameters)
    } catch (error) {
      console.error('❌ Failed to track event:', error)
    }
  }

  // Track user actions
  trackAction(action: string, category: string, label?: string, value?: number) {
    this.trackEvent(action, {
      event_category: category,
      event_label: label,
      value: value
    })
  }

  // Track tool usage
  trackToolUsage(toolName: string, action: string, details?: Record<string, any>) {
    this.trackEvent('tool_usage', {
      tool_name: toolName,
      action: action,
      ...details
    })
  }

  // Track app lifecycle events
  trackAppEvent(event: 'startup' | 'shutdown' | 'error', details?: Record<string, any>) {
    this.trackEvent('app_lifecycle', {
      lifecycle_event: event,
      ...details
    })
  }

  // Track feature usage
  trackFeature(featureName: string, parameters?: Record<string, any>) {
    this.trackEvent('feature_usage', {
      feature_name: featureName,
      ...parameters
    })
  }

  // Enable/disable tracking
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    console.log(`📊 Google Analytics ${enabled ? 'enabled' : 'disabled'}`)
  }

  // Check if analytics is ready
  isReady() {
    return this.isInitialized && this.isEnabled
  }

  // Update measurement ID
  updateMeasurementId(measurementId: string) {
    this.measurementId = measurementId
    this.isInitialized = false // Reset to allow re-initialization
  }
}

// Create and export analytics instance
// You'll need to replace 'GA_MEASUREMENT_ID' with your actual Google Analytics 4 Measurement ID
const analytics = new GoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX')

export default analytics
