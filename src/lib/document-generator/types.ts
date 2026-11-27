export interface TemplateData {
  [key: string]: string | number | boolean;
}

export interface RenderOptions {
  includeHeader?: boolean;
  includeFooter?: boolean;
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export interface SectionRenderer {
  canRender(sectionId: string): boolean;
  render(section: any, data: TemplateData): string;
}

export interface TemplateRenderer {
  renderSections(sections: any[], data: TemplateData): string;
  getTemplateInfo(template: any): {
    id: string;
    name: string;
    category: string;
    description: string;
    fields: any[];
    styling: any;
  };
}
