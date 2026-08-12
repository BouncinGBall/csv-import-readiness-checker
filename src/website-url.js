export function normalizeWebsiteUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    return null;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
    const hasUsableHost = url.hostname === 'localhost' || url.hostname.includes('.');
    const hasNoCredentials = !url.username && !url.password;

    return isWebUrl && hasUsableHost && hasNoCredentials ? url.href : null;
  } catch {
    return null;
  }
}
