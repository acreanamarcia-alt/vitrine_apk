import type { DeviceType, TrackEventPayload, TrafficSource } from '../types/analytics';

const SESSION_KEY = 'vitrine_apk_anon_session';
const CONSENT_KEY = 'vitrine_apk_lgpd_consent';

export type LgpdConsentState = 'pending' | 'accepted' | 'essential';

export function getSessionHash(): string {
  try {
    let existing = sessionStorage.getItem(SESSION_KEY);
    if (!existing) {
      const rand = Math.random().toString(36).slice(2, 10);
      existing = `anon_${rand}`;
      sessionStorage.setItem(SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return 'anon_browser';
  }
}

export function getConsentState(): LgpdConsentState {
  try {
    const val = localStorage.getItem(CONSENT_KEY);
    if (val === 'accepted' || val === 'essential') return val;
    return 'pending';
  } catch {
    return 'pending';
  }
}

export function setConsentState(state: 'accepted' | 'essential'): void {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // ignore storage restriction
  }
}

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function detectTrafficSource(): TrafficSource {
  if (typeof window === 'undefined') return 'direct';
  const ref = (document.referrer || '').toLowerCase();
  const search = window.location.search.toLowerCase();
  if (search.includes('utm_source=instagram') || search.includes('utm_source=facebook') || ref.includes('instagram') || ref.includes('facebook') || ref.includes('tiktok')) {
    return 'social';
  }
  if (search.includes('utm_source=google') || ref.includes('google') || ref.includes('bing')) {
    return 'search';
  }
  return 'direct';
}

function getApproxRegion(consentGiven: boolean): string | undefined {
  if (!consentGiven) return undefined;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Sao_Paulo')) return 'São Paulo, SP';
    if (tz.includes('Bahia')) return 'Salvador, BA';
    if (tz.includes('Recife') || tz.includes('Fortaleza')) return 'Recife, PE';
    if (tz.includes('Manaus')) return 'Manaus, AM';
    return 'São Paulo, SP';
  } catch {
    return undefined;
  }
}

export async function sendTrackingEvent(
  partial: Omit<TrackEventPayload, 'sessionHash' | 'deviceType' | 'source' | 'consentGiven' | 'region'> & {
    deviceType?: DeviceType;
    source?: TrafficSource;
  },
): Promise<void> {
  const consent = getConsentState();
  const consentGiven = consent === 'accepted';
  const payload: TrackEventPayload = {
    sessionHash: getSessionHash(),
    trackingId: partial.trackingId,
    scope: partial.scope,
    eventType: partial.eventType,
    page: partial.page,
    appId: partial.appId,
    productId: partial.productId,
    productName: partial.productName,
    featureName: partial.featureName,
    deviceType: partial.deviceType ?? detectDeviceType(),
    source: partial.source ?? detectTrafficSource(),
    region: getApproxRegion(consentGiven),
    durationSec: partial.durationSec,
    consentGiven,
  };

  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Non-blocking telemetry
  }
}
