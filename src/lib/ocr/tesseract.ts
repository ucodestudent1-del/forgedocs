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
  language?: string
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export async function performOCR(
  file: File | Blob,
  options: OCROptions = {}
): Promise<OCRResult> {
  const { language = 'eng', onProgress, signal } = options
  
  if (!worker) {
    await initializeOCR(language)
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
      text: (result as any).text,
      confidence: (result as any).confidence,
      data: result as any,
      pages: ((result as any).pages?.length || 1),
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

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })
}