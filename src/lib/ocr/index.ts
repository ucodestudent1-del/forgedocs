import { performOCR as performTesseractOCR, terminateOCR } from './tesseract'
export { performOCR as performTesseractOCR, terminateOCR } from './tesseract'
export type { OCRResult as TesseractResult, OCROptions } from './tesseract'
export type { CloudOCRResult } from './cloud'

export interface OCRResult {
  text: string
  confidence: number
  pages: number
  provider: string
  language?: string
}

export interface OCROptions {
  provider?: 'auto' | 'tesseract' | 'aws' | 'google' | 'azure'
  language?: string
  onProgress?: (progress: number) => void
  signal?: AbortSignal
  fallbackToCloud?: boolean
}

export interface OCRProvider {
  name: string
  available: boolean
  maxFileSize?: number
  supportedFormats?: string[]
}

export const OCR_PROVIDERS: Record<string, OCRProvider> = {
  tesseract: {
    name: 'Tesseract.js (Local)',
    available: true,
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['image/png', 'image/jpeg', 'image/tiff', 'image/bmp', 'application/pdf']
  },
  aws: {
    name: 'AWS Textract',
    available: !!process.env.AWS_TEXTRACT_API_KEY,
    maxFileSize: 50 * 1024 * 1024,
    supportedFormats: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']
  },
  google: {
    name: 'Google Vision',
    available: !!process.env.GOOGLE_VISION_API_KEY,
    maxFileSize: 20 * 1024 * 1024,
    supportedFormats: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']
  },
  azure: {
    name: 'Azure Vision',
    available: !!process.env.AZURE_VISION_KEY,
    maxFileSize: 20 * 1024 * 1024,
    supportedFormats: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']
  }
}

export async function getAvailableProviders(): Promise<OCRProvider[]> {
  return Object.values(OCR_PROVIDERS).filter(p => p.available)
}

export async function performOCR(
  file: File,
  options: {
    provider?: 'auto' | 'tesseract' | 'aws' | 'google' | 'azure'
    language?: string
    onProgress?: (progress: number) => void
    signal?: AbortSignal
    fallbackToCloud?: boolean
  } = {}
): Promise<{
  text: string
  confidence: number
  pages: number
  provider: string
  language?: string
}> {
  const {
    provider = 'auto',
    language = 'eng',
    onProgress,
    signal,
    fallbackToCloud = true
  } = options
  
  const availableProviders = await getAvailableProviders()
  const providerNames = availableProviders.map(p => p.name.toLowerCase().replace(/\s+/g, ''))
  
  let selectedProvider = provider
  if (provider === 'auto') {
    selectedProvider = 'tesseract'
  }
  
  if (!availableProviders.some(p => p.name.toLowerCase().replace(/\s+/g, '') === selectedProvider)) {
    if (fallbackToCloud) {
      const cloudProviders = availableProviders.filter(p => p.name !== 'Tesseract.js (Local)')
      if (cloudProviders.length > 0) {
        selectedProvider = cloudProviders[0].name.toLowerCase().replace(/\s+/g, '') as 'aws' | 'google' | 'azure'
      } else {
        throw new Error('No OCR providers available')
      }
    } else {
      throw new Error(`Provider ${selectedProvider} not available`)
    }
  }
  
  const selectedProviderConfig = OCR_PROVIDERS[selectedProvider]
  if (selectedProviderConfig.maxFileSize && file.size > selectedProviderConfig.maxFileSize) {
    if (fallbackToCloud) {
      const cloudProviders = availableProviders.filter(p => p.name !== 'Tesseract.js (Local)' && p.maxFileSize && p.maxFileSize >= file.size)
      if (cloudProviders.length > 0) {
        selectedProvider = cloudProviders[0].name.toLowerCase().replace(/\s+/g, '') as 'aws' | 'google' | 'azure'
      } else {
        throw new Error(`File too large for available providers (max: ${Math.max(...availableProviders.map(p => p.maxFileSize || 0))} bytes)`)
      }
    } else {
      throw new Error(`File too large for ${selectedProviderConfig.name} (max: ${selectedProviderConfig.maxFileSize} bytes)`)
    }
  }
  
  try {
    if (selectedProvider === 'tesseract') {
      const { performOCR: performTesseractOCR } = await import('./tesseract')
      const result = await performTesseractOCR(file, { language: options.language || 'eng', onProgress })
      return {
        text: result.text,
        confidence: result.confidence,
        pages: result.pages,
        provider: 'tesseract',
        language: options.language
      }
    } else {
      const { performCloudOCR } = await import('./cloud')
      const result = await performCloudOCR(file, selectedProvider as 'aws' | 'google' | 'azure')
      return {
        text: result.text,
        confidence: result.confidence,
        pages: result.pages,
        provider: selectedProvider,
        language: options.language
      }
    }
  } catch (error) {
    console.error(`[OCR] ${selectedProvider} failed:`, error)
    
    if (selectedProvider === 'tesseract' && fallbackToCloud) {
      const cloudProviders = (await getAvailableProviders()).filter(p => p.name !== 'Tesseract.js (Local)')
      if (cloudProviders.length > 0) {
        console.log('[OCR] Falling back to cloud provider')
        const fallbackProvider = cloudProviders[0].name.toLowerCase().replace(/\s+/g, '')
        const { performCloudOCR } = await import('./cloud')
        const result = await performCloudOCR(file, fallbackProvider as 'aws' | 'google' | 'azure')
        return {
          text: result.text,
          confidence: result.confidence,
          pages: result.pages,
          provider: `${selectedProvider} -> ${fallbackProvider} (fallback)`,
          language: options.language
        }
      }
    }
    throw error
  }
}

export type { OCRResult as TesseractResult, OCROptions } from './tesseract'
export type { CloudOCRResult } from './cloud'