/**
 * Validate ZIP-based file contents (DOCX, XLSX, PPTX, etc.)
 * Checks for dangerous content like macros, scripts, or suspicious XML parts.
 */
export function validateZipContents(fileBytes: Uint8Array): boolean {
  try {
    // ZIP files start with PK header - check it's a valid ZIP
    if (fileBytes.length < 4) return false
    if (fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4B) return false
    
    // Convert to string to scan for dangerous patterns in XML parts
    const content = Buffer.from(fileBytes).toString("binary")
    
    // Check for dangerous patterns in ZIP contents
    const dangerousPatterns = [
      /<w:macro[^>]*>/gi,           // Word macros
      /<w:script[^>]*>/gi,          // Word scripts  
      /<m:macro[^>]*>/gi,           // Excel macros
      /<p:macro[^>]*>/gi,           // PowerPoint macros
      /vbaProject\.bin/gi,          // VBA project binary
      /<[^>]*onload\s*=/gi,         // onload handlers
      /<[^>]*onerror\s*=/gi,        // onerror handlers
      /javascript:/gi,              // javascript: URLs
      /<\?php/gi,                   // PHP tags
      /<\?=/gi,                     // PHP short tags
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}