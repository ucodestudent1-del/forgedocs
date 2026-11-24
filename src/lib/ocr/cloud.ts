import { createClient } from '@supabase/supabase-js'
import logger from "@/lib/logger"

export interface CloudOCRResult {
  text: string
  confidence: number
  pages: number
  provider: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function uploadToTempStorage(file: File): Promise<{ path: string; signedUrl: string } | null> {
  const supabase = getServerClient()
  const fileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const path = `ocr-temp/${crypto.randomUUID()}/${fileName}`
  
  const { data: upload, error: uploadError } = await supabase.storage
    .from('ocr-temp')
    .upload(path, file, { contentType: file.type, upsert: false })
  
  if (uploadError || !upload) {
    logger.error('OCR temp upload failed:', { error: uploadError })
    return null
  }
  
  const { data: signedUrlData } = await supabase.storage
    .from('ocr-temp')
    .createSignedUrl(upload.path, 3600)
  
  return { path: upload.path, signedUrl: signedUrlData?.signedUrl || '' }
}

async function cleanupTempFile(path: string): Promise<void> {
  const supabase = getServerClient()
  await supabase.storage.from('ocr-temp').remove([path])
}

async function callAWS_Textract(signedUrl: string): Promise<{ text: string; confidence: number; pages: number }> {
  try {
    const response = await fetch(`${process.env.AWS_TEXTRACT_ENDPOINT}/analyze-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AWS_TEXTRACT_API_KEY}`,
      },
      body: JSON.stringify({
        document: { s3Object: { url: signedUrl } },
        featureTypes: ['TEXT', 'FORMS', 'TABLES'],
      }),
    })

    if (!response.ok) throw new Error('AWS Textract failed')
    const data = await response.json()
    
    return {
      text: data.blocks?.filter((b: any) => b.blockType === 'LINE').map((b: any) => b.text).join('\n') || '',
      confidence: data.blocks?.reduce((sum: number, b: any) => sum + (b.confidence || 0), 0) / (data.blocks?.length || 1) || 0,
      pages: data.documentMetadata?.pages || 1,
    }
  } catch (error) {
    logger.error('AWS Textract error:', { error: error })
    throw error
  }
}

async function callGoogleVision(signedUrl: string): Promise<{ text: string; confidence: number; pages: number }> {
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: signedUrl } },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }),
    })

    if (!response.ok) throw new Error('Google Vision failed')
    const data = await response.json()
    
    const annotations = data.responses?.[0]?.fullTextAnnotation
    return {
      text: annotations?.text || '',
      confidence: annotations?.pages?.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / (annotations?.pages?.length || 1) || 0,
      pages: annotations?.pages?.length || 1,
    }
  } catch (error) {
    logger.error('Google Vision error:', { error: error })
    throw error
  }
}

async function callAzureVision(signedUrl: string): Promise<{ text: string; confidence: number; pages: number }> {
  try {
    const response = await fetch(`${process.env.AZURE_VISION_ENDPOINT}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY!,
      },
      body: JSON.stringify({ url: signedUrl }),
    })

    if (!response.ok) throw new Error('Azure Vision failed')
    
    const operationUrl = response.headers.get('operation-location')
    if (!operationUrl) throw new Error('No operation URL from Azure')

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000))
      const result = await fetch(operationUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY! }
      })
      const data = await result.json()
      if (data.status === 'succeeded') {
        const text = data.analyzeResult?.readResults?.flatMap((r: any) => r.lines?.map((l: any) => l.text).join('\n') || '').join('\n') || ''
        const confidence = data.analyzeResult?.readResults?.flatMap((r: any) => r.lines?.flatMap((l: any) => l.words?.map((w: any) => w.confidence || 0) || []) || []).reduce((a: number, b: number) => a + b, 0) / (data.analyzeResult?.readResults?.flatMap((r: any) => r.lines?.flatMap((l: any) => l.words?.length || 0) || []).reduce((a: number, b: number) => a + b, 0) || 1) || 0
        return { text, confidence, pages: data.analyzeResult?.readResults?.length || 1 }
      }
    }
    throw new Error('Azure Vision timeout')
  } catch (error) {
    logger.error('Azure Vision error:', { error: error })
    throw error
  }
}

export async function performCloudOCR(
  file: File,
  provider: 'aws' | 'google' | 'azure' = 'aws'
): Promise<{ text: string; confidence: number; pages: number; provider: string }> {
  const uploadResult = await uploadToTempStorage(file)
  if (!uploadResult) {
    throw new Error('Failed to upload file for cloud OCR')
  }
  
  const { path, signedUrl } = uploadResult
  
  try {
    let result: { text: string; confidence: number; pages: number }
    
    switch (provider) {
      case 'aws':
        result = await callAWS_Textract(signedUrl)
        break
      case 'google':
        result = await callGoogleVision(signedUrl)
        break
      case 'azure':
        result = await callAzureVision(signedUrl)
        break
      default:
        throw new Error(`Unknown OCR provider: ${provider}`)
    }
    
    return { ...result, provider }
  } finally {
    await cleanupTempFile(path)
  }
}

export async function performClientCloudOCR(
  file: File,
  provider: 'aws' | 'google' | 'azure' = 'aws'
): Promise<{ text: string; confidence: number; pages: number; provider: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('provider', provider)
  
  const response = await fetch('/api/ocr/cloud', {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Cloud OCR failed')
  }
  
  return response.json()
}