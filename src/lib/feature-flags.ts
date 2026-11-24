const FEATURE_FLAGS: Record<string, boolean> = {
  enable_templates: true,
  enable_conversion: true,
  enable_billing: true,
  enable_audit_log: true,
  enable_collaboration: true,
  enable_advanced_templates: true,
  enable_guest_mode: false,
}

export function isFeatureEnabled(flag: string): boolean {
  return FEATURE_FLAGS[flag] ?? false
}

export function setFeatureFlag(flag: string, enabled: boolean): void {
  FEATURE_FLAGS[flag] = enabled
}