/**
 * Sensitive Data Masking Utility
 * Redacts secrets, API keys, credentials, and connection strings
 * from reports, charts, and public exports.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /bearer/i,
];

const SECRET_PATTERNS: Array<{ regex: RegExp; replace: (...args: any[]) => string }> = [
  // AWS Access Key ID
  {
    regex: /(AKIA[0-9A-Z]{16})/g,
    replace: (match) => `${match.substring(0, 4)}••••••••••••${match.substring(match.length - 2)}`,
  },
  // Stripe/OpenAI/Generic sk_live or sk_test
  {
    regex: /(sk_(?:live|test)_[0-9a-zA-Z]{16,})/g,
    replace: (match) => `${match.substring(0, 7)}••••••••[REDACTED_API_KEY]`,
  },
  // GitHub Personal Access Token
  {
    regex: /(ghp_[0-9a-zA-Z]{30,})/g,
    replace: (match) => `${match.substring(0, 4)}••••••••[REDACTED_GITHUB_TOKEN]`,
  },
  // Bearer Authorization tokens
  {
    regex: /(Bearer\s+)([a-zA-Z0-9_\-\.]{15,})/gi,
    replace: (_match, p1) => `${p1}••••••••[REDACTED_BEARER_TOKEN]`,
  },
  // Basic Auth header strings
  {
    regex: /(Basic\s+)([a-zA-Z0-9+/=]{15,})/gi,
    replace: (_match, p1) => `${p1}••••••••[REDACTED_BASIC_AUTH]`,
  },
  // Database connection strings
  {
    regex: /(postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis):\/\/([^:]+):([^@]+)@/gi,
    replace: (_match, protocol, user) => `${protocol}://${user}:••••••••@`,
  },
  // Private Key Blocks
  {
    regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+)?PRIVATE KEY-----/gi,
    replace: () => '[REDACTED_PRIVATE_KEY_BLOCK]',
  },
  // Inline password assignments (e.g. password=..., password: ...)
  {
    regex: /(password\s*[:=]\s*)([^\s;,\n&"']+)/gi,
    replace: (_match, p1) => `${p1}••••••••[REDACTED_PASSWORD]`,
  },
];

export function maskSensitiveData(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let masked = text;
  for (const { regex, replace } of SECRET_PATTERNS) {
    masked = masked.replace(regex, replace as any);
  }

  return masked;
}

export function maskObjectData<T = any>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return maskSensitiveData(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskObjectData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
      if (isSensitiveKey && typeof value === 'string' && value.length > 0) {
        if (value.length <= 6) {
          result[key] = '••••••••';
        } else {
          result[key] = `${value.substring(0, 3)}••••••••[REDACTED]`;
        }
      } else {
        result[key] = maskObjectData(value);
      }
    }
    return result as T;
  }

  return data;
}
