export interface DNSRecordResult {
  name: string;
  type: string;
  data: string;
  TTL: number;
}

export interface WhoisResult {
  domainName: string;
  registrar?: string;
  creationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  status?: string[];
  nameServers?: string[];
  registrantOrg?: string;
  registrantCountry?: string;
  raw?: any;
}

export interface CertRecordResult {
  id?: string;
  issuer: string;
  commonName: string;
  sanList: string[];
  notBefore?: string;
  notAfter?: string;
}

export interface CTDiscoveryResult {
  subdomains: string[];
  certificates: CertRecordResult[];
}

export interface WaybackUrlResult {
  originalUrl: string;
  path: string;
  timestamp: string;
  mimetype?: string;
  statuscode?: string;
  parameters: string[];
}

export interface WaybackArchiveResult {
  urlCount: number;
  endpoints: string[];
  parameters: string[];
  sampleUrls: string[];
}

export interface HttpTechResult {
  statusCode: number | null;
  technologies: { name: string; category: string; confidence: number; version?: string }[];
  headers: Record<string, string>;
  securityScore: number;
  hasHsts: boolean;
  hasCsp: boolean;
  hasXFrameOptions: boolean;
  hasContentTypeOptions: boolean;
  hasReferrerPolicy: boolean;
  missingSecurityHeaders: string[];
}

export interface PassiveReconResult {
  domain: string;
  dnsRecords: {
    a: DNSRecordResult[];
    aaaa: DNSRecordResult[];
    mx: DNSRecordResult[];
    txt: DNSRecordResult[];
    ns: DNSRecordResult[];
    cname: DNSRecordResult[];
  };
  whois: WhoisResult | null;
  ctDiscovery: CTDiscoveryResult;
  waybackArchive: WaybackArchiveResult;
  httpAnalysis: HttpTechResult;
  discoveredAssets: {
    subdomains: string[];
    ips: string[];
    endpoints: string[];
    parameters: string[];
    technologies: { name: string; category: string; confidence: number }[];
    certificates: CertRecordResult[];
  };
}

/**
 * Resolves DNS records using Cloudflare 1.1.1.1 DNS-over-HTTPS (DoH) JSON API
 */
export async function resolveDNSOverHTTPS(domain: string, type: string = 'A'): Promise<DNSRecordResult[]> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${type}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/dns-json',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const typeNames: Record<number, string> = {
      1: 'A',
      2: 'NS',
      5: 'CNAME',
      6: 'SOA',
      15: 'MX',
      16: 'TXT',
      28: 'AAAA',
    };

    return (data.Answer || []).map((ans: any) => ({
      name: ans.name,
      type: typeNames[ans.type] || `${ans.type}`,
      data: ans.data?.replace(/^"|"$/g, '') || ans.data,
      TTL: ans.TTL,
    }));
  } catch (err) {
    console.warn(`DNS lookup failed for ${domain} (${type}):`, err);
    return [];
  }
}

/**
 * Queries public RDAP (Registration Data Access Protocol) for domain WHOIS information
 */
export async function queryWhoisRDAP(domain: string): Promise<WhoisResult | null> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rdap+json, application/json',
        'User-Agent': 'SentinelRecon-PassiveDiscovery/1.0',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Fallback response structure if RDAP registry is uncommunicative
      return {
        domainName: cleanDomain,
        registrar: 'Public Registry (Query throttled or private)',
        status: ['active'],
      };
    }

    const data = await res.json();

    // Extract registrar entity
    let registrarName: string | undefined;
    let registrantOrg: string | undefined;
    let registrantCountry: string | undefined;

    if (Array.isArray(data.entities)) {
      for (const entity of data.entities) {
        if (entity.roles?.includes('registrar')) {
          registrarName = entity.vcardArray?.[1]?.find((item: any) => item[0] === 'fn')?.[3] || entity.handle;
        }
        if (entity.roles?.includes('registrant')) {
          registrantOrg = entity.vcardArray?.[1]?.find((item: any) => item[0] === 'org')?.[3];
          const adr = entity.vcardArray?.[1]?.find((item: any) => item[0] === 'adr');
          if (adr && Array.isArray(adr[3])) {
            registrantCountry = adr[3][6];
          }
        }
      }
    }

    // Extract events
    let creationDate: string | undefined;
    let expirationDate: string | undefined;
    let updatedDate: string | undefined;

    if (Array.isArray(data.events)) {
      for (const ev of data.events) {
        if (ev.eventAction === 'registration') creationDate = ev.eventDate;
        if (ev.eventAction === 'expiration') expirationDate = ev.eventDate;
        if (ev.eventAction === 'last changed') updatedDate = ev.eventDate;
      }
    }

    // Extract nameservers
    const nameServers: string[] = [];
    if (Array.isArray(data.nameservers)) {
      data.nameservers.forEach((ns: any) => {
        if (ns.ldhName) nameServers.push(ns.ldhName.toLowerCase());
      });
    }

    return {
      domainName: data.ldhName || cleanDomain,
      registrar: registrarName || 'Unknown Registrar',
      creationDate,
      expirationDate,
      updatedDate,
      status: data.status || ['active'],
      nameServers,
      registrantOrg,
      registrantCountry,
      raw: { handle: data.handle, ldhName: data.ldhName, status: data.status },
    };
  } catch (err) {
    console.warn(`RDAP WHOIS query failed for ${domain}:`, err);
    return null;
  }
}

/**
 * Queries crt.sh Certificate Transparency logs to discover valid subdomains and certificates
 */
export async function queryCertificateTransparency(domain: string): Promise<CTDiscoveryResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SentinelRecon-PassiveDiscovery/1.0',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { subdomains: [], certificates: [] };
    }

    const data = await res.json();
    const subdomains = new Set<string>();
    const certsMap = new Map<string, CertRecordResult>();

    if (Array.isArray(data)) {
      data.forEach((entry: any) => {
        const nameValue = entry.name_value;
        const entryIssuer = entry.issuer_name || 'Unknown CA';
        const notBefore = entry.not_before;
        const notAfter = entry.not_after;
        const commonName = entry.common_name || cleanDomain;
        const sans: string[] = [];

        if (nameValue) {
          nameValue.split('\n').forEach((sub: string) => {
            const cleaned = sub.trim().toLowerCase();
            sans.push(cleaned);
            if (!cleaned.includes('*') && (cleaned === cleanDomain || cleaned.endsWith(`.${cleanDomain}`))) {
              subdomains.add(cleaned);
            }
          });
        }

        const certKey = `${commonName}_${notAfter}`;
        if (!certsMap.has(certKey) && certsMap.size < 15) {
          certsMap.set(certKey, {
            id: entry.id?.toString(),
            issuer: entryIssuer.split(',')[0] || entryIssuer,
            commonName,
            sanList: Array.from(new Set(sans)).slice(0, 10),
            notBefore,
            notAfter,
          });
        }
      });
    }

    return {
      subdomains: Array.from(subdomains).slice(0, 50),
      certificates: Array.from(certsMap.values()),
    };
  } catch (err) {
    console.warn(`crt.sh lookup failed or timed out for ${domain}:`, err);
    return { subdomains: [], certificates: [] };
  }
}

/**
 * Queries Wayback Machine CDX API for historical URLs, endpoints, and query parameters
 */
export async function queryWaybackArchive(domain: string): Promise<WaybackArchiveResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const url = `https://web.archive.org/cdx/search/cdx?url=*.${encodeURIComponent(
      cleanDomain
    )}/*&output=json&collapse=urlkey&fl=original,timestamp,mimetype,statuscode&limit=40`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SentinelRecon-PassiveEngine/1.0',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { urlCount: 0, endpoints: [], parameters: [], sampleUrls: [] };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length <= 1) {
      return { urlCount: 0, endpoints: [], parameters: [], sampleUrls: [] };
    }

    // First row is headers: ["original", "timestamp", "mimetype", "statuscode"]
    const dataRows = rows.slice(1);
    const endpointsSet = new Set<string>();
    const paramsSet = new Set<string>();
    const sampleUrls: string[] = [];

    dataRows.forEach(([originalUrl]) => {
      if (!originalUrl) return;
      sampleUrls.push(originalUrl);

      try {
        const parsed = new URL(originalUrl);
        if (parsed.pathname && parsed.pathname !== '/') {
          endpointsSet.add(parsed.pathname);
        }

        parsed.searchParams.forEach((_, key) => {
          if (key) paramsSet.add(key);
        });
      } catch {
        // Simple regex fallback if invalid URL
        const pathMatch = originalUrl.match(/https?:\/\/[^\/]+(\/[^?#]*)/);
        if (pathMatch && pathMatch[1] && pathMatch[1] !== '/') {
          endpointsSet.add(pathMatch[1]);
        }
      }
    });

    return {
      urlCount: dataRows.length,
      endpoints: Array.from(endpointsSet).slice(0, 20),
      parameters: Array.from(paramsSet).slice(0, 20),
      sampleUrls: sampleUrls.slice(0, 10),
    };
  } catch (err) {
    console.warn(`Wayback archive lookup failed for ${domain}:`, err);
    return { urlCount: 0, endpoints: [], parameters: [], sampleUrls: [] };
  }
}

/**
 * Performs passive HTTP header & technology analysis with security headers audit
 */
export async function analyzeHttpTechnology(targetUrl: string): Promise<HttpTechResult> {
  const technologies: { name: string; category: string; confidence: number; version?: string }[] = [];
  const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(normalizedUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SentinelRecon/1.0',
      },
    });

    clearTimeout(timeout);

    const serverHeader = res.headers.get('server') || '';
    const poweredBy = res.headers.get('x-powered-by') || '';
    const cfRay = res.headers.get('cf-ray');
    const hsts = res.headers.get('strict-transport-security');
    const csp = res.headers.get('content-security-policy');
    const xFrameOptions = res.headers.get('x-frame-options');
    const xContentType = res.headers.get('x-content-type-options');
    const referrerPolicy = res.headers.get('referrer-policy');

    if (serverHeader) {
      technologies.push({ name: serverHeader, category: 'Web Server', confidence: 95 });
    }
    if (poweredBy) {
      technologies.push({ name: poweredBy, category: 'Backend Framework', confidence: 90 });
    }
    if (cfRay) {
      technologies.push({ name: 'Cloudflare CDN / WAF', category: 'CDN/Security', confidence: 100 });
    }
    if (res.headers.get('x-nextjs-cache') || res.headers.get('x-nextjs-matched-path')) {
      technologies.push({ name: 'Next.js', category: 'Web Framework', confidence: 95 });
    }
    if (res.headers.get('x-vercel-id')) {
      technologies.push({ name: 'Vercel Edge Platform', category: 'Cloud/Hosting', confidence: 100 });
    }

    const missingSecurityHeaders: string[] = [];
    let securityScore = 4; // Base score

    if (!hsts) {
      missingSecurityHeaders.push('Strict-Transport-Security (HSTS)');
      securityScore += 2;
    }
    if (!csp) {
      missingSecurityHeaders.push('Content-Security-Policy (CSP)');
      securityScore += 2;
    }
    if (!xFrameOptions) {
      missingSecurityHeaders.push('X-Frame-Options (Clickjacking protection)');
      securityScore += 1;
    }
    if (!xContentType) {
      missingSecurityHeaders.push('X-Content-Type-Options (MIME-sniffing protection)');
      securityScore += 1;
    }
    if (serverHeader.match(/[\d.]+/)) {
      securityScore += 1; // Server banner discloses exact version
    }

    return {
      statusCode: res.status,
      technologies,
      headers: Object.fromEntries(res.headers.entries()),
      securityScore: Math.min(10, securityScore),
      hasHsts: !!hsts,
      hasCsp: !!csp,
      hasXFrameOptions: !!xFrameOptions,
      hasContentTypeOptions: !!xContentType,
      hasReferrerPolicy: !!referrerPolicy,
      missingSecurityHeaders,
    };
  } catch (err) {
    return {
      statusCode: null,
      technologies,
      headers: {},
      securityScore: 4,
      hasHsts: false,
      hasCsp: false,
      hasXFrameOptions: false,
      hasContentTypeOptions: false,
      hasReferrerPolicy: false,
      missingSecurityHeaders: ['Target Host Unreachable / HTTPS Handshake Failed'],
    };
  }
}

/**
 * Runs a comprehensive server-side passive recon routine combining all passive streams
 */
export async function runComprehensivePassiveRecon(domain: string): Promise<PassiveReconResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0].trim();

  // Execute all passive streams in parallel
  const [
    aRecords,
    aaaaRecords,
    mxRecords,
    txtRecords,
    nsRecords,
    cnameRecords,
    whoisData,
    ctData,
    waybackData,
    httpData,
  ] = await Promise.all([
    resolveDNSOverHTTPS(cleanDomain, 'A'),
    resolveDNSOverHTTPS(cleanDomain, 'AAAA'),
    resolveDNSOverHTTPS(cleanDomain, 'MX'),
    resolveDNSOverHTTPS(cleanDomain, 'TXT'),
    resolveDNSOverHTTPS(cleanDomain, 'NS'),
    resolveDNSOverHTTPS(cleanDomain, 'CNAME'),
    queryWhoisRDAP(cleanDomain),
    queryCertificateTransparency(cleanDomain),
    queryWaybackArchive(cleanDomain),
    analyzeHttpTechnology(cleanDomain),
  ]);

  const discoveredIps = Array.from(
    new Set([...aRecords.map((r) => r.data), ...aaaaRecords.map((r) => r.data)])
  );

  return {
    domain: cleanDomain,
    dnsRecords: {
      a: aRecords,
      aaaa: aaaaRecords,
      mx: mxRecords,
      txt: txtRecords,
      ns: nsRecords,
      cname: cnameRecords,
    },
    whois: whoisData,
    ctDiscovery: ctData,
    waybackArchive: waybackData,
    httpAnalysis: httpData,
    discoveredAssets: {
      subdomains: ctData.subdomains,
      ips: discoveredIps,
      endpoints: waybackData.endpoints,
      parameters: waybackData.parameters,
      technologies: httpData.technologies,
      certificates: ctData.certificates,
    },
  };
}
