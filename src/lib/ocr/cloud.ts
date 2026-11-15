import { createClient } from '@supabase/supabase-js'

export interface CloudOCRResult {
  text: string
  confidence: number
  pages: number
  provider: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client for storage operations
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
    console.error('OCR temp upload failed:', uploadError)
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
  // This would use @aws-sdk/client-textract in production
  // For now, return a structured response indicating the provider
  return {
    text: '[AWS Textract] OCR processing would occur here. Configure AWS credentials and implement Textract client.',
    confidence: 0,
    pages: 1
  }
}

async function callGoogleVision(signedUrl: string): Promise<{ text: string; confidence: number; pages: number }> {
  // This would use @google-cloud/vision in production
  return {
    text: '[Google Vision] OCR processing would occur here. Configure Google Cloud credentials.',
    confidence: 0,
    pages: 1
  }
}

async function callAzureVision(signedUrl: string): Promise<{ text: string; confidence: number; pages: number }> {
  // This would use @azure/cognitiveservices-computervision
  return {
    text: '[Azure Vision] OCR processing would occur here. Configure Azure credentials.',
    confidence: 0,
    pages: 1
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
    // Cleanup temp file
    await cleanupTempFile(path)
  }
}

// Client-side helper for browser uploads
export async function performClientCloudOCR(
  file: File,
  provider: 'aws' | 'google' | 'azure' = 'aws'
): Promise<{ text: string; confidence: number; pages: number; provider: string }> {
  // In a real implementation, this would call an API route
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