import { createWorker, PSM, OEM, RecognizeResult } from 'tesseract.js'

let worker: Tesseract.Worker | null = null
let isInitializing = false

export async function initializeOCR(language = 'eng'): Promise<void> {
  if (worker || isInitializing) return
  
  isInitializing = true
  try {
    worker = await createWorker(language, OEM.LSTM_ONLY, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
      cachePath: typeof window !== 'undefined' ? '/tesseract-cache' : undefined
    })
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO_OSD,
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',
    })
    
    console.log('[OCR] Worker initialized')
  } catch (error) {
    console.error('[OCR] Failed to initialize:', error)
    worker = null
    throw error
  } finally {
    isInitializing = false
  }
}

export interface OCRResult {
  text: string
  confidence: number
  data: RecognizeResult
  pages: number
  language: string
}

export interface OCROptions {
  provider?: 'auto' | 'tesseract' | 'aws' | 'google' | 'azure'
  language?: string
  onProgress?: (progress: number) => void
  signal?: AbortSignal
  fallbackToCloud?: boolean
}

export async function performOCR(
  file: File,
  options: {
    language?: string
    onProgress?: (progress: number) => void
    signal?: AbortSignal
  } = {}
): Promise<OCRResult> {
  const { language = 'eng', onProgress, signal } = options
  
  if (!worker) {
    await initializeOCR()
  }
  
  if (!worker) {
    throw new Error('OCR worker failed to initialize')
  }
  
  if (signal?.aborted) {
    throw new Error('OCR aborted')
  }
  
  try {
    const result = await worker.recognize(file, {
      onProgress: (progress: number) => {
        if (onProgress) {
          onProgress(Math.round(progress * 100))
        }
      }
    } as any)
    
    return {
      text: result.text,
      confidence: result.confidence,
      data: result,
      pages: result.pages?.length || 1,
      language
    }
  } catch (error) {
    console.error('[OCR] Recognition failed:', error)
    throw error
  }
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    console.log('[OCR] Worker terminated')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })
}