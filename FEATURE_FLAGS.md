# Feature Flags

This document describes the feature flag system for ForgeDocs.

## Feature Flags

| Flag | Description | Default | Environments |
|------|-------------|---------|--------------|
| `enable_templates` | Enable template generation feature | true | all |
| `enable_conversion` | Enable document conversion feature | true | all |
| `enable_billing` | Enable billing/Stripe integration | false | production |
| `enable_audit_log` | Enable audit logging for all actions | true | production |
| `enable_collaboration` | Enable real-time collaborative editing | false | all |
| `enable_advanced_templates` | Enable advanced template features | false | production |

## Usage

```typescript
import { isFeatureEnabled } from "@/lib/feature-flags"

if (isFeatureEnabled("enable_billing")) {
  // Show billing UI
}
```

## Implementation

```typescript
// src/lib/feature-flags.ts
const FEATURE_FLAGS: Record<string, boolean> = {
  enable_templates: true,
  enable_conversion: true,
  enable_billing: false,
  enable_audit_log: true,
  enable_collaboration: false,
  enable_advanced_templates: false,
}

export function isFeatureEnabled(flag: string): boolean {
  return FEATURE_FLAGS[flag] ?? false
}

export function setFeatureFlag(flag: string, enabled: boolean): void {
  FEATURE_FLAGS[flag] = enabled
}
```

## Rollout Process

1. Add feature flag with default `false`
2. Deploy code behind flag
3. Enable flag for 10% of users
4. Monitor metrics and errors
5. Gradually increase to 100%
6. Remove flag and old code path
