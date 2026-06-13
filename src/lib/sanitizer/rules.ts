/**
 * Provider-prefix regex rules for secret detection.
 * Each rule maps to a detector ID and carries a version string.
 * Spec: SANITIZER.md §5.1.1 (gitleaks grounding)
 */

export interface ProviderPrefixRule {
  id: string;
  version: string;
  /** Regex that matches the entire secret token (capture group 0) */
  pattern: RegExp;
  severity: 'critical' | 'blocking';
  suggestedMaskBase: string; // base for mask token, e.g. "api-key"
}

export const PROVIDER_PREFIX_RULES: ProviderPrefixRule[] = [
  // Anthropic API keys: sk-ant-...
  {
    id: 'secrets.provider-prefix.anthropic',
    version: '1.0',
    pattern: /\bsk-ant-[A-Za-z0-9\-_]{20,}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'api-key',
  },
  // OpenAI API keys: sk-... (not sk-ant-; ≥20 chars after prefix)
  {
    id: 'secrets.provider-prefix.openai',
    version: '1.0',
    pattern: /\bsk-(?!ant-)[A-Za-z0-9]{20,}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'api-key',
  },
  // Stripe secret keys: sk_live_... or sk_test_...
  {
    id: 'secrets.provider-prefix.stripe',
    version: '1.0',
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'stripe-key',
  },
  // GitHub tokens: classic PATs, OAuth/app tokens, fine-grained PATs, refresh tokens
  {
    id: 'secrets.provider-prefix.github',
    version: '1.0',
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{82,})\b/g,
    severity: 'critical',
    suggestedMaskBase: 'github-token',
  },
  // Slack tokens: xoxb- or xoxp-
  {
    id: 'secrets.provider-prefix.slack',
    version: '1.0',
    pattern: /\b(xoxb-|xoxp-)[A-Za-z0-9\-]{20,}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'slack-token',
  },
  // AWS access key IDs: includes IAM/user/session variants from gitleaks.
  {
    id: 'secrets.provider-prefix.aws',
    version: '1.0',
    pattern: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'aws-key',
  },
  // AWS STS session tokens and secret access keys are usually seen in assignments.
  {
    id: 'secrets.provider-prefix.aws-session-token',
    version: '1.0',
    pattern: /\b(?:AQoDYXdzEJr[0-9A-Za-z+/=_-]{40,}|FQoGZXIvYXdzE[0-9A-Za-z+/=_-]{40,})\b/g,
    severity: 'critical',
    suggestedMaskBase: 'aws-session-token',
  },
  // PEM private keys
  {
    id: 'secrets.provider-prefix.pem',
    version: '1.0',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    suggestedMaskBase: 'private-key',
  },
];

/**
 * Map from detectorId → version for all rules in this module.
 */
export const RULE_VERSIONS: Record<string, string> = Object.fromEntries(
  PROVIDER_PREFIX_RULES.map((r) => [r.id, r.version])
);
