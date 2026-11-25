import { z } from "zod"

/* ============================================================================
   Conversion Types
   ============================================================================ */

export type ConversionType = "document" | "unit" | "metadata"

export interface ConversionFormat {
  id: string
  name: string
  mimeType: string
  extension: string
  category: "document" | "image" | "spreadsheet" | "presentation" | "text" | "unit" | "metadata"
}

export interface ConversionPair {
  source: string
  target: string
  supported: boolean
  requiresOcr?: boolean
  mayLoseData?: boolean
}

export interface ConversionOptions {
  ocr?: boolean
  quality?: number
  preserveMetadata?: boolean
  flatten?: boolean
  [key: string]: unknown
}

export interface ConversionJobInput {
  type: ConversionType
  sourceFormat: string
  targetFormat: string
  sourceValue: string | File | null
  sourceUrl?: string
  options?: ConversionOptions
}

/* ============================================================================
   Format Registry - Universal Format Support
   ============================================================================ */

export const FORMAT_REGISTRY: Record<string, ConversionFormat> = {
  // Documents
  pdf: { id: "pdf", name: "PDF Document", mimeType: "application/pdf", extension: ".pdf", category: "document" },
  docx: { id: "docx", name: "Word Document", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx", category: "document" },
  doc: { id: "doc", name: "Word 97-2003 Document", mimeType: "application/msword", extension: ".doc", category: "document" },
  rtf: { id: "rtf", name: "Rich Text Format", mimeType: "application/rtf", extension: ".rtf", category: "document" },
  odt: { id: "odt", name: "OpenDocument Text", mimeType: "application/vnd.oasis.opendocument.text", extension: ".odt", category: "document" },
  txt: { id: "txt", name: "Plain Text", mimeType: "text/plain", extension: ".txt", category: "text" },
  md: { id: "md", name: "Markdown", mimeType: "text/markdown", extension: ".md", category: "text" },
  html: { id: "html", name: "HTML Document", mimeType: "text/html", extension: ".html", category: "document" },
  epub: { id: "epub", name: "Electronic Publication", mimeType: "application/epub+zip", extension: ".epub", category: "document" },

  // Spreadsheets
  xlsx: { id: "xlsx", name: "Excel Workbook", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: ".xlsx", category: "spreadsheet" },
  xls: { id: "xls", name: "Excel 97-2003 Workbook", mimeType: "application/vnd.ms-excel", extension: ".xls", category: "spreadsheet" },
  csv: { id: "csv", name: "Comma Separated Values", mimeType: "text/csv", extension: ".csv", category: "spreadsheet" },
  ods: { id: "ods", name: "OpenDocument Spreadsheet", mimeType: "application/vnd.oasis.opendocument.spreadsheet", extension: ".ods", category: "spreadsheet" },
  tsv: { id: "tsv", name: "Tab Separated Values", mimeType: "text/tab-separated-values", extension: ".tsv", category: "spreadsheet" },

  // Presentations
  pptx: { id: "pptx", name: "PowerPoint Presentation", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: ".pptx", category: "presentation" },
  ppt: { id: "ppt", name: "PowerPoint 97-2003 Presentation", mimeType: "application/vnd.ms-powerpoint", extension: ".ppt", category: "presentation" },
  odp: { id: "odp", name: "OpenDocument Presentation", mimeType: "application/vnd.oasis.opendocument.presentation", extension: ".odp", category: "presentation" },

  // Images
  jpg: { id: "jpg", name: "JPEG Image", mimeType: "image/jpeg", extension: ".jpg", category: "image" },
  jpeg: { id: "jpeg", name: "JPEG Image", mimeType: "image/jpeg", extension: ".jpeg", category: "image" },
  png: { id: "png", name: "PNG Image", mimeType: "image/png", extension: ".png", category: "image" },
  gif: { id: "gif", name: "GIF Image", mimeType: "image/gif", extension: ".gif", category: "image" },
  bmp: { id: "bmp", name: "Bitmap Image", mimeType: "image/bmp", extension: ".bmp", category: "image" },
  tiff: { id: "tiff", name: "TIFF Image", mimeType: "image/tiff", extension: ".tiff", category: "image" },
  webp: { id: "webp", name: "WebP Image", mimeType: "image/webp", extension: ".webp", category: "image" },
  svg: { id: "svg", name: "SVG Image", mimeType: "image/svg+xml", extension: ".svg", category: "image" },

  // Unit conversion pseudo-formats (category: unit)
  length: { id: "length", name: "Length", mimeType: "application/x-unit-length", extension: "", category: "unit" },
  mass: { id: "mass", name: "Mass/Weight", mimeType: "application/x-unit-mass", extension: "", category: "unit" },
  temperature: { id: "temperature", name: "Temperature", mimeType: "application/x-unit-temperature", extension: "", category: "unit" },
  volume: { id: "volume", name: "Volume", mimeType: "application/x-unit-volume", extension: "", category: "unit" },
  area: { id: "area", name: "Area", mimeType: "application/x-unit-area", extension: "", category: "unit" },
  speed: { id: "speed", name: "Speed", mimeType: "application/x-unit-speed", extension: "", category: "unit" },
  "data-size": { id: "data-size", name: "Data Size", mimeType: "application/x-unit-data", extension: "", category: "unit" },
  angle: { id: "angle", name: "Angle", mimeType: "application/x-unit-angle", extension: "", category: "unit" },
  energy: { id: "energy", name: "Energy", mimeType: "application/x-unit-energy", extension: "", category: "unit" },
  pressure: { id: "pressure", name: "Pressure", mimeType: "application/x-unit-pressure", extension: "", category: "unit" },
  time: { id: "time", name: "Time", mimeType: "application/x-unit-time", extension: "", category: "unit" },

  // Metadata
  json: { id: "json", name: "JSON Metadata", mimeType: "application/json", extension: ".json", category: "metadata" },
  xml: { id: "xml", name: "XML Metadata", mimeType: "application/xml", extension: ".xml", category: "metadata" },
  yaml: { id: "yaml", name: "YAML Metadata", mimeType: "application/yaml", extension: ".yaml", category: "metadata" },
  csv_meta: { id: "csv_meta", name: "CSV Metadata", mimeType: "text/csv", extension: ".csv", category: "metadata" },
}

/* ============================================================================
   Supported Conversion Pairs Matrix
   ============================================================================ */

const DOCUMENT_PAIRS: ConversionPair[] = [
  // Word -> everything
  { source: "docx", target: "pdf", supported: true },
  { source: "docx", target: "txt", supported: true },
  { source: "docx", target: "html", supported: true },
  { source: "docx", target: "md", supported: true },
  { source: "docx", target: "rtf", supported: true },
  { source: "docx", target: "odt", supported: true },
  { source: "docx", target: "epub", supported: true },
  // PDF -> everything
  { source: "pdf", target: "docx", supported: true, mayLoseData: true },
  { source: "pdf", target: "txt", supported: true, requiresOcr: true },
  { source: "pdf", target: "html", supported: true, requiresOcr: true },
  { source: "pdf", target: "md", supported: true, requiresOcr: true },
  { source: "pdf", target: "epub", supported: true },
  { source: "pdf", target: "xlsx", supported: true, mayLoseData: true },
  { source: "pdf", target: "csv", supported: true, mayLoseData: true },
  // Spreadsheet -> everything
  { source: "xlsx", target: "pdf", supported: true },
  { source: "xlsx", target: "csv", supported: true },
  { source: "xlsx", target: "tsv", supported: true },
  { source: "xlsx", target: "html", supported: true },
  { source: "xlsx", target: "ods", supported: true },
  { source: "csv", target: "xlsx", supported: true },
  { source: "csv", target: "pdf", supported: true },
  { source: "csv", target: "tsv", supported: true },
  { source: "csv", target: "html", supported: true },
  { source: "csv", target: "ods", supported: true },
  // Presentation
  { source: "pptx", target: "pdf", supported: true },
  { source: "pptx", target: "html", supported: true },
  { source: "pptx", target: "odp", supported: true },
  // Image
  { source: "jpg", target: "png", supported: true },
  { source: "jpg", target: "webp", supported: true },
  { source: "jpg", target: "pdf", supported: true },
  { source: "png", target: "jpg", supported: true },
  { source: "png", target: "webp", supported: true },
  { source: "png", target: "pdf", supported: true },
  { source: "webp", target: "jpg", supported: true },
  { source: "webp", target: "png", supported: true },
  { source: "tiff", target: "jpg", supported: true },
  { source: "tiff", target: "png", supported: true },
  { source: "bmp", target: "jpg", supported: true },
  { source: "bmp", target: "png", supported: true },
  { source: "gif", target: "jpg", supported: true },
  { source: "gif", target: "png", supported: true },
  { source: "svg", target: "png", supported: true },
  { source: "svg", target: "jpg", supported: true },
  // Text
  { source: "txt", target: "pdf", supported: true },
  { source: "txt", target: "html", supported: true },
  { source: "txt", target: "docx", supported: true },
  { source: "md", target: "html", supported: true },
  { source: "md", target: "pdf", supported: true },
  { source: "md", target: "docx", supported: true },
  { source: "html", target: "pdf", supported: true },
  { source: "html", target: "docx", supported: true },
  { source: "html", target: "txt", supported: true },
  // EPub
  { source: "epub", target: "pdf", supported: true },
  { source: "epub", target: "txt", supported: true },
]

const UNIT_CONVERSIONS: Record<string, Record<string, (value: number) => number>> = {
  length: {
    "m->km": (v) => v / 1000,
    "km->m": (v) => v * 1000,
    "m->cm": (v) => v * 100,
    "cm->m": (v) => v / 100,
    "m->mm": (v) => v * 1000,
    "mm->m": (v) => v / 1000,
    "km->mi": (v) => v * 0.621371,
    "mi->km": (v) => v * 1.60934,
    "m->ft": (v) => v * 3.28084,
    "ft->m": (v) => v / 3.28084,
    "m->in": (v) => v * 39.3701,
    "in->m": (v) => v / 39.3701,
    "cm->in": (v) => v / 2.54,
    "in->cm": (v) => v * 2.54,
    "ft->in": (v) => v * 12,
    "in->ft": (v) => v / 12,
    "yd->m": (v) => v * 0.9144,
    "m->yd": (v) => v / 0.9144,
    "mi->ft": (v) => v * 5280,
    "ft->mi": (v) => v / 5280,
    "nm->m": (v) => v * 1e-9,
    "m->nm": (v) => v * 1e9,
  },
  mass: {
    "kg->g": (v) => v * 1000,
    "g->kg": (v) => v / 1000,
    "kg->mg": (v) => v * 1e6,
    "mg->kg": (v) => v / 1e6,
    "kg->t": (v) => v / 1000,
    "t->kg": (v) => v * 1000,
    "kg->lb": (v) => v * 2.20462,
    "lb->kg": (v) => v / 2.20462,
    "kg->oz": (v) => v * 35.274,
    "oz->kg": (v) => v / 35.274,
    "lb->oz": (v) => v * 16,
    "oz->lb": (v) => v / 16,
    "t->lb": (v) => v * 2204.62,
    "lb->t": (v) => v / 2204.62,
    "g->mg": (v) => v * 1000,
    "mg->g": (v) => v / 1000,
    "stone->kg": (v) => v * 6.35029,
    "kg->stone": (v) => v / 6.35029,
    "carat->g": (v) => v * 0.2,
    "g->carat": (v) => v * 5,
  },
  temperature: {
    "c->f": (v) => (v * 9) / 5 + 32,
    "f->c": (v) => ((v - 32) * 5) / 9,
    "c->k": (v) => v + 273.15,
    "k->c": (v) => v - 273.15,
    "f->k": (v) => ((v - 32) * 5) / 9 + 273.15,
    "k->f": (v) => ((v - 273.15) * 9) / 5 + 32,
  },
  volume: {
    "l->ml": (v) => v * 1000,
    "ml->l": (v) => v / 1000,
    "l->m3": (v) => v / 1000,
    "m3->l": (v) => v * 1000,
    "l->gal": (v) => v * 0.264172,
    "gal->l": (v) => v * 3.78541,
    "l->cup": (v) => v * 4.22675,
    "cup->l": (v) => v / 4.22675,
    "l->fl oz": (v) => v * 33.814,
    "fl oz->l": (v) => v / 33.814,
    "ml->tsp": (v) => v / 4.92892,
    "tsp->ml": (v) => v * 4.92892,
    "ml->tbsp": (v) => v / 14.7868,
    "tbsp->ml": (v) => v * 14.7868,
    "gal->qt": (v) => v * 4,
    "qt->gal": (v) => v / 4,
    "qt->pt": (v) => v * 2,
    "pt->qt": (v) => v / 2,
    "barrel->l": (v) => v * 158.987,
    "l->barrel": (v) => v / 158.987,
  },
  area: {
    "m2->km2": (v) => v / 1e6,
    "km2->m2": (v) => v * 1e6,
    "m2->cm2": (v) => v * 10000,
    "cm2->m2": (v) => v / 10000,
    "m2->mm2": (v) => v * 1e6,
    "mm2->m2": (v) => v / 1e6,
    "m2->ft2": (v) => v * 10.7639,
    "ft2->m2": (v) => v / 10.7639,
    "m2->acre": (v) => v * 0.000247105,
    "acre->m2": (v) => v * 4046.86,
    "km2->mile2": (v) => v * 0.386102,
    "mile2->km2": (v) => v * 2.58999,
    "acre->mile2": (v) => v * 0.0015625,
    "mile2->acre": (v) => v * 640,
    "hectare->m2": (v) => v * 10000,
    "m2->hectare": (v) => v / 10000,
    "acre->hectare": (v) => v * 0.404686,
    "hectare->acre": (v) => v / 0.404686,
  },
  speed: {
    "m/s->km/h": (v) => v * 3.6,
    "km/h->m/s": (v) => v / 3.6,
    "m/s->mph": (v) => v * 2.23694,
    "mph->m/s": (v) => v / 2.23694,
    "km/h->mph": (v) => v * 0.621371,
    "mph->km/h": (v) => v * 1.60934,
    "ft/s->m/s": (v) => v * 0.3048,
    "m/s->ft/s": (v) => v / 0.3048,
    "knot->km/h": (v) => v * 1.852,
    "km/h->knot": (v) => v / 1.852,
    "knot->mph": (v) => v * 1.15078,
    "mph->knot": (v) => v / 1.15078,
  },
  "data-size": {
    "b->kb": (v) => v / 1024,
    "kb->b": (v) => v * 1024,
    "kb->mb": (v) => v / 1024,
    "mb->kb": (v) => v * 1024,
    "mb->gb": (v) => v / 1024,
    "gb->mb": (v) => v * 1024,
    "gb->tb": (v) => v / 1024,
    "tb->gb": (v) => v * 1024,
    "b->mb": (v) => v / (1024 * 1024),
    "mb->b": (v) => v * 1024 * 1024,
    "b->gb": (v) => v / (1024 * 1024 * 1024),
    "gb->b": (v) => v * 1024 * 1024 * 1024,
    "kb->bit": (v) => v * 8192,
    "bit->kb": (v) => v / 8192,
    "mb->bit": (v) => v * 8388608,
    "bit->mb": (v) => v / 8388608,
  },
  angle: {
    "deg->rad": (v) => (v * Math.PI) / 180,
    "rad->deg": (v) => (v * 180) / Math.PI,
    "deg->grad": (v) => (v * 200) / 180,
    "grad->deg": (v) => (v * 180) / 200,
    "deg->turn": (v) => v / 360,
    "turn->deg": (v) => v * 360,
    "rad->grad": (v) => (v * 200) / Math.PI,
    "grad->rad": (v) => (v * Math.PI) / 200,
  },
  energy: {
    "j->kj": (v) => v / 1000,
    "kj->j": (v) => v * 1000,
    "j->cal": (v) => v / 4.184,
    "cal->j": (v) => v * 4.184,
    "j->kcal": (v) => v / 4184,
    "kcal->j": (v) => v * 4184,
    "kj->kcal": (v) => v / 4.184,
    "kcal->kj": (v) => v * 4.184,
    "j->wh": (v) => v / 3600,
    "wh->j": (v) => v * 3600,
    "kj->wh": (v) => v / 3.6,
    "wh->kj": (v) => v * 3.6,
    "cal->kcal": (v) => v / 1000,
    "kcal->cal": (v) => v * 1000,
    "btu->j": (v) => v * 1055.06,
    "j->btu": (v) => v / 1055.06,
  },
  pressure: {
    "pa->kpa": (v) => v / 1000,
    "kpa->pa": (v) => v * 1000,
    "pa->bar": (v) => v / 100000,
    "bar->pa": (v) => v * 100000,
    "bar->psi": (v) => v * 14.5038,
    "psi->bar": (v) => v / 14.5038,
    "pa->psi": (v) => v / 6894.76,
    "psi->pa": (v) => v * 6894.76,
    "atm->pa": (v) => v * 101325,
    "pa->atm": (v) => v / 101325,
    "atm->bar": (v) => v * 1.01325,
    "bar->atm": (v) => v / 1.01325,
    "mmhg->pa": (v) => v * 133.322,
    "pa->mmhg": (v) => v / 133.322,
  },
  time: {
    "s->ms": (v) => v * 1000,
    "ms->s": (v) => v / 1000,
    "s->min": (v) => v / 60,
    "min->s": (v) => v * 60,
    "min->h": (v) => v / 60,
    "h->min": (v) => v * 60,
    "h->d": (v) => v / 24,
    "d->h": (v) => v * 24,
    "d->w": (v) => v / 7,
    "w->d": (v) => v * 7,
    "s->h": (v) => v / 3600,
    "h->s": (v) => v * 3600,
    "s->d": (v) => v / 86400,
    "d->s": (v) => v * 86400,
    "w->h": (v) => v * 168,
    "h->w": (v) => v / 168,
    "mo->d": (v) => v * 30.44,
    "d->mo": (v) => v / 30.44,
    "y->d": (v) => v * 365.25,
    "d->y": (v) => v / 365.25,
  },
}

const UNIT_KEYS: Record<string, { from: string; to: string }[]> = {
  length: [
    { from: "m", to: "km" }, { from: "km", to: "m" }, { from: "m", to: "cm" }, { from: "cm", to: "m" },
    { from: "m", to: "mm" }, { from: "mm", to: "m" }, { from: "km", to: "mi" }, { from: "mi", to: "km" },
    { from: "m", to: "ft" }, { from: "ft", to: "m" }, { from: "m", to: "in" }, { from: "in", to: "m" },
    { from: "cm", to: "in" }, { from: "in", to: "cm" }, { from: "ft", to: "in" }, { from: "in", to: "ft" },
    { from: "yd", to: "m" }, { from: "m", to: "yd" }, { from: "mi", to: "ft" }, { from: "ft", to: "mi" },
    { from: "nm", to: "m" }, { from: "m", to: "nm" },
  ],
  mass: [
    { from: "kg", to: "g" }, { from: "g", to: "kg" }, { from: "kg", to: "mg" }, { from: "mg", to: "kg" },
    { from: "kg", to: "t" }, { from: "t", to: "kg" }, { from: "kg", to: "lb" }, { from: "lb", to: "kg" },
    { from: "kg", to: "oz" }, { from: "oz", to: "kg" }, { from: "lb", to: "oz" }, { from: "oz", to: "lb" },
    { from: "t", to: "lb" }, { from: "lb", to: "t" }, { from: "g", to: "mg" }, { from: "mg", to: "g" },
    { from: "stone", to: "kg" }, { from: "kg", to: "stone" }, { from: "carat", to: "g" }, { from: "g", to: "carat" },
  ],
  temperature: [
    { from: "c", to: "f" }, { from: "f", to: "c" }, { from: "c", to: "k" }, { from: "k", to: "c" },
    { from: "f", to: "k" }, { from: "k", to: "f" },
  ],
  volume: [
    { from: "l", to: "ml" }, { from: "ml", to: "l" }, { from: "l", to: "m3" }, { from: "m3", to: "l" },
    { from: "l", to: "gal" }, { from: "gal", to: "l" }, { from: "l", to: "cup" }, { from: "cup", to: "l" },
    { from: "l", to: "fl oz" }, { from: "fl oz", to: "l" }, { from: "ml", to: "tsp" }, { from: "tsp", to: "ml" },
    { from: "ml", to: "tbsp" }, { from: "tbsp", to: "ml" }, { from: "gal", to: "qt" }, { from: "qt", to: "gal" },
    { from: "qt", to: "pt" }, { from: "pt", to: "qt" }, { from: "barrel", to: "l" }, { from: "l", to: "barrel" },
  ],
  area: [
    { from: "m2", to: "km2" }, { from: "km2", to: "m2" }, { from: "m2", to: "cm2" }, { from: "cm2", to: "m2" },
    { from: "m2", to: "mm2" }, { from: "mm2", to: "m2" }, { from: "m2", to: "ft2" }, { from: "ft2", to: "m2" },
    { from: "m2", to: "acre" }, { from: "acre", to: "m2" }, { from: "km2", to: "mile2" }, { from: "mile2", to: "km2" },
    { from: "acre", to: "mile2" }, { from: "mile2", to: "acre" }, { from: "hectare", to: "m2" }, { from: "m2", to: "hectare" },
    { from: "acre", to: "hectare" }, { from: "hectare", to: "acre" },
  ],
  speed: [
    { from: "m/s", to: "km/h" }, { from: "km/h", to: "m/s" }, { from: "m/s", to: "mph" }, { from: "mph", to: "m/s" },
    { from: "km/h", to: "mph" }, { from: "mph", to: "km/h" }, { from: "ft/s", to: "m/s" }, { from: "m/s", to: "ft/s" },
    { from: "knot", to: "km/h" }, { from: "km/h", to: "knot" }, { from: "knot", to: "mph" }, { from: "mph", to: "knot" },
  ],
  "data-size": [
    { from: "b", to: "kb" }, { from: "kb", to: "b" }, { from: "kb", to: "mb" }, { from: "mb", to: "kb" },
    { from: "mb", to: "gb" }, { from: "gb", to: "mb" }, { from: "gb", to: "tb" }, { from: "tb", to: "gb" },
    { from: "b", to: "mb" }, { from: "mb", to: "b" }, { from: "b", to: "gb" }, { from: "gb", to: "b" },
    { from: "kb", to: "bit" }, { from: "bit", to: "kb" }, { from: "mb", to: "bit" }, { from: "bit", to: "mb" },
  ],
  angle: [
    { from: "deg", to: "rad" }, { from: "rad", to: "deg" }, { from: "deg", to: "grad" }, { from: "grad", to: "deg" },
    { from: "deg", to: "turn" }, { from: "turn", to: "deg" }, { from: "rad", to: "grad" }, { from: "grad", to: "rad" },
  ],
  energy: [
    { from: "j", to: "kj" }, { from: "kj", to: "j" }, { from: "j", to: "cal" }, { from: "cal", to: "j" },
    { from: "j", to: "kcal" }, { from: "kcal", to: "j" }, { from: "kj", to: "kcal" }, { from: "kcal", to: "kj" },
    { from: "j", to: "wh" }, { from: "wh", to: "j" }, { from: "kj", to: "wh" }, { from: "wh", to: "kj" },
    { from: "cal", to: "kcal" }, { from: "kcal", to: "cal" }, { from: "btu", to: "j" }, { from: "j", to: "btu" },
  ],
  pressure: [
    { from: "pa", to: "kpa" }, { from: "kpa", to: "pa" }, { from: "pa", to: "bar" }, { from: "bar", to: "pa" },
    { from: "bar", to: "psi" }, { from: "psi", to: "bar" }, { from: "pa", to: "psi" }, { from: "psi", to: "pa" },
    { from: "atm", to: "pa" }, { from: "pa", to: "atm" }, { from: "atm", to: "bar" }, { from: "bar", to: "atm" },
    { from: "mmhg", to: "pa" }, { from: "pa", to: "mmhg" },
  ],
  time: [
    { from: "s", to: "ms" }, { from: "ms", to: "s" }, { from: "s", to: "min" }, { from: "min", to: "s" },
    { from: "min", to: "h" }, { from: "h", to: "min" }, { from: "h", to: "d" }, { from: "d", to: "h" },
    { from: "d", to: "w" }, { from: "w", to: "d" }, { from: "s", to: "h" }, { from: "h", to: "s" },
    { from: "s", to: "d" }, { from: "d", to: "s" }, { from: "w", to: "h" }, { from: "h", to: "w" },
    { from: "mo", to: "d" }, { from: "d", to: "mo" }, { from: "y", to: "d" }, { from: "d", to: "y" },
  ],
}

/* ============================================================================
   Helper Functions
   ============================================================================ */

export function getFormat(formatId: string): ConversionFormat | undefined {
  return FORMAT_REGISTRY[formatId]
}

export function getSupportedTargets(sourceFormat: string): string[] {
  return DOCUMENT_PAIRS.filter((p) => p.source === sourceFormat && p.supported).map((p) => p.target)
}

export function getAllConversionPairs(): ConversionPair[] {
  return DOCUMENT_PAIRS
}

export function getUnitCategories(): string[] {
  return Object.keys(UNIT_CONVERSIONS)
}

export function getUnitPairs(category: string): { from: string; to: string }[] {
  return UNIT_KEYS[category] || []
}

export function isPairSupported(source: string, target: string): boolean {
  return DOCUMENT_PAIRS.some((p) => p.source === source && p.target === target && p.supported)
}

export function unitConversionKey(category: string, from: string, to: string): string {
  return `${category}:${from}->${to}`
}

export function convertUnit(value: number, category: string, fromUnit: string, toUnit: string): number {
  const conversions = UNIT_CONVERSIONS[category]
  if (!conversions) throw new Error(`Unknown unit category: ${category}`)
  const key = `${fromUnit}->${toUnit}`
  const fn = conversions[key]
  if (!fn) throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit} in ${category}`)
  return fn(value)
}

/* ============================================================================
   Metadata Transformation
   ============================================================================ */

export interface MetadataTransformInput {
  sourceFormat: "json" | "xml" | "yaml" | "csv_meta"
  targetFormat: "json" | "xml" | "yaml" | "csv_meta"
  data: Record<string, unknown>
  options?: { flatten?: boolean; prefix?: string }
}

export function transformMetadata(input: MetadataTransformInput): string {
  const { sourceFormat, targetFormat, data, options } = input
  const flatten = options?.flatten ?? false
  const prefix = options?.prefix ?? ""

  const flat = flatten ? flattenObject(data, prefix) : data

  switch (targetFormat) {
    case "json":
      return JSON.stringify(flat, null, 2)
    case "yaml":
      return toYaml(flat)
    case "xml":
      return toXml(flat)
    case "csv_meta":
      return toCsv(flat)
    default:
      throw new Error(`Unsupported metadata target format: ${targetFormat}`)
  }
}

function flattenObject(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function toYaml(obj: Record<string, unknown>): string {
  const lines: string[] = []
  function recurse(o: unknown, indent: number) {
    const pad = "  ".repeat(indent)
    if (o && typeof o === "object" && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
          lines.push(`${pad}${k}:`)
          recurse(v, indent + 1)
        } else if (Array.isArray(v)) {
          lines.push(`${pad}${k}:`)
          v.forEach((item) => lines.push(`${pad}  - ${String(item)}`))
        } else {
          lines.push(`${pad}${k}: ${String(v)}`)
        }
      }
    }
  }
  recurse(obj, 0)
  return lines.join("\n")
}

function toXml(obj: Record<string, unknown>): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', "<metadata>"]
  function recurse(o: unknown, tag: string, indent: number) {
    const pad = "  ".repeat(indent)
    if (o && typeof o === "object" && !Array.isArray(o)) {
      lines.push(`${pad}<${tag}>`)
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        recurse(v, k, indent + 1)
      }
      lines.push(`${pad}</${tag}>`)
    } else if (Array.isArray(o)) {
      o.forEach((_, i) => recurse(_, `${tag}_item`, indent + 1))
    } else {
      lines.push(`${pad}<${tag}>${escapeXml(String(o))}</${tag}>`)
    }
  }
  recurse(obj, "root", 0)
  lines.push("</metadata>")
  return lines.join("\n")
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

function toCsv(obj: Record<string, unknown>): string {
  const flat = flattenObject(obj, "")
  const headers = Object.keys(flat)
  const values = headers.map((h) => String(flat[h]).replace(/"/g, '""'))
  return [`"${headers.join('","')}"`, `"${values.join('","')}"`].join("\n")
}

/* ============================================================================
   Document Conversion Dispatcher (server-side)
   ============================================================================ */

export interface ConvertDocumentResult {
  outputUrl: string
  mimeType: string
  size: number
  sourceFormat: string
  targetFormat: string
  convertedAt: string
}

export async function convertDocumentServer(
  sourceContent: string | Buffer,
  sourceMimeType: string,
  targetFormat: string,
  options: ConversionOptions = {}
): Promise<ConvertDocumentResult> {
  const format = getFormat(targetFormat)
  if (!format) {
    throw new Error(`Unsupported target format: ${targetFormat}`)
  }

  // Detect source format from mime type
  const sourceFormat = Object.values(FORMAT_REGISTRY).find((f) => f.mimeType === sourceMimeType)?.id || "txt"

  // Validate pair
  if (!isPairSupported(sourceFormat, targetFormat) && targetFormat !== sourceFormat) {
    // Allow direct same-type conversions even if not explicitly listed
    if (!DOCUMENT_PAIRS.some((p) => p.source === sourceFormat && p.target === targetFormat)) {
      throw new Error(`Conversion from ${sourceFormat} to ${targetFormat} is not supported`)
    }
  }

  const contentStr = Buffer.isBuffer(sourceContent) ? sourceContent.toString("utf8") : String(sourceContent)

  let outputContent: string
  let outputMimeType = format.mimeType

  // Simple text-based conversions
  if (["txt", "md", "html", "csv", "tsv", "json", "xml", "yaml"].includes(targetFormat)) {
    outputContent = performTextConversion(contentStr, sourceFormat, targetFormat, options)
  } else if (targetFormat === "pdf") {
    outputContent = `# Converted to PDF\n\nSource: ${sourceFormat}\nContent:\n${contentStr}`
  } else if (targetFormat === "docx") {
    outputContent = `# Converted Document\n\nSource: ${sourceFormat}\nContent:\n${contentStr}`
  } else {
    outputContent = contentStr
  }

  return {
    outputUrl: `data:${outputMimeType};base64,${Buffer.from(outputContent).toString("base64")}`,
    mimeType: outputMimeType,
    size: Buffer.byteLength(outputContent, "utf8"),
    sourceFormat,
    targetFormat,
    convertedAt: new Date().toISOString(),
  }
}

function performTextConversion(content: string, source: string, target: string, options: ConversionOptions): string {
  switch (target) {
    case "html":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Converted from ${source}</title></head><body><pre>${escapeHtml(content)}</pre></body></html>`
    case "md":
      return `# Converted from ${source}\n\n\`\`\`\n${content}\n\`\`\``
    case "pdf":
      return `# PDF Export\n\nSource: ${source}\n\n${content}`
    case "txt":
      return content
    case "csv":
      return content.split("\n").map((line) => `"${line}"`).join("\n")
    default:
      return content
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/* ============================================================================
   Zod Schemas
   ============================================================================ */

export const conversionJobSchema = z.object({
  type: z.enum(["document", "unit", "metadata"]).default("document"),
  source_format: z.string().min(1),
  target_format: z.string().min(1),
  source_url: z.string().url().optional(),
  value: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
})
