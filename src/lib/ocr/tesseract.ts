import { createWorker, PSM, OEM, RecognizeResult } from 'tesseract.js'
import logger from "@/lib/logger"

let worker: Tesseract.Worker | null = null
let isInitializing = false
let workerJobCount = 0
const MAX_JOBS_PER_WORKER = 100

export async function initializeOCR(language = 'eng'): Promise<void> {
  if (worker || isInitializing) return
  
  isInitializing = true
  try {
    worker = await createWorker(language, OEM.LSTM_ONLY, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
      cachePath: typeof window !== 'undefined' ? '/tesseract-cache' : undefined
    })
    
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO_OSD,
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0',
    })
    
    logger.info('[OCR] Worker initialized')
    workerJobCount = 0
  } catch (error) {
    logger.error('[OCR] Failed to initialize:', { error: error })
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
  
  // Recycle worker periodically to prevent memory leaks
  if (workerJobCount >= MAX_JOBS_PER_WORKER) {
    await terminateOCR()
    worker = null
    workerJobCount = 0
  }
  
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

    workerJobCount++

    return {
      text: (result as any).text,
      confidence: (result as any).confidence,
      data: result,
      pages: (result as any).pages?.length || 1,
      language
    }
  } catch (error) {
    logger.error('[OCR] Recognition failed:', { error: error })
    throw error
  }
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    logger.info('[OCR] Worker terminated')
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

if (typeof process !== 'undefined' && process) {
  process.on('beforeExit', async () => {
    if (worker) {
      try { await worker.terminate() } catch {}
      worker = null
    }
  })
  process.on('SIGTERM', async () => {
    if (worker) {
      try { await worker.terminate() } catch {}
      worker = null
    }
  })
  process.on('SIGINT', async () => {
    if (worker) {
      try { await worker.terminate() } catch {}
      worker = null
    }
  })
}