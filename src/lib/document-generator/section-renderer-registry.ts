import type { SectionRenderer } from './types';

export class SectionRendererRegistry {
  private renderers: Map<string, SectionRenderer[]> = new Map()
  private defaultRenderer: SectionRenderer | null = null

  register(sectionId: string, renderer: SectionRenderer): void {
    const existing = this.renderers.get(sectionId) || []
    existing.unshift(renderer) // More specific renderers first
    this.renderers.set(sectionId, existing)
  }

  setDefault(renderer: SectionRenderer): void {
    this.defaultRenderer = renderer
  }

  findRenderer(sectionId: string): SectionRenderer {
    const renderers = this.renderers.get(sectionId)
    if (renderers && renderers.length > 0) {
      return renderers[0]
    }
    if (this.defaultRenderer) {
      return this.defaultRenderer
    }
    throw new Error('No renderer found and no default renderer set')
  }

  buildRendererList(): SectionRenderer[] {
    const list: SectionRenderer[] = []
    for (const renderers of this.renderers.values()) {
      list.push(...renderers)
    }
    if (this.defaultRenderer) {
      list.push(this.defaultRenderer)
    }
    return list
  }
}