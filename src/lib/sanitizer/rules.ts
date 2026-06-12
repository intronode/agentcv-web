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
  // GitHub personal access tokens: ghp_ or gho_
  {
    id: 'secrets.provider-prefix.github',
    version: '1.0',
    pattern: /\b(ghp_|gho_)[A-Za-z0-9]{36,}\b/g,
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
  // AWS access key IDs: AKIA...
  {
    id: 'secrets.provider-prefix.aws',
    version: '1.0',
    pattern: /\bAKIA[A-Z0-9]{16}\b/g,
    severity: 'critical',
    suggestedMaskBase: 'aws-key',
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
