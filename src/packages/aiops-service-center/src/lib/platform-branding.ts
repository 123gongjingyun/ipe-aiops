export interface PlatformBrandingConfig {
  platformName: string;
  platformShortName: string;
  platformSubtitle: string;
  browserTitle: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
  showSubtitle: boolean;
}

export const PLATFORM_BRANDING_STORAGE_KEY = 'ipe_center_platform_branding_v1';
export const PLATFORM_BRANDING_EVENT = 'ipe:center-branding-change';

export const DEFAULT_PLATFORM_BRANDING: PlatformBrandingConfig = {
  platformName: '交付运营中心',
  platformShortName: 'AI',
  platformSubtitle: 'IPE / AIOps',
  browserTitle: 'IPE/AIOps 服务运营中心',
  logoDataUrl: null,
  faviconDataUrl: null,
  showSubtitle: true,
};

export function loadPlatformBranding(): PlatformBrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_BRANDING;
  try {
    const raw = window.localStorage.getItem(PLATFORM_BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_BRANDING;
    const parsed = JSON.parse(raw) as Partial<PlatformBrandingConfig>;
    return {
      platformName: parsed.platformName || DEFAULT_PLATFORM_BRANDING.platformName,
      platformShortName: parsed.platformShortName || DEFAULT_PLATFORM_BRANDING.platformShortName,
      platformSubtitle: parsed.platformSubtitle || DEFAULT_PLATFORM_BRANDING.platformSubtitle,
      browserTitle: parsed.browserTitle || DEFAULT_PLATFORM_BRANDING.browserTitle,
      logoDataUrl: parsed.logoDataUrl ?? DEFAULT_PLATFORM_BRANDING.logoDataUrl,
      faviconDataUrl: parsed.faviconDataUrl ?? DEFAULT_PLATFORM_BRANDING.faviconDataUrl,
      showSubtitle: typeof parsed.showSubtitle === 'boolean' ? parsed.showSubtitle : DEFAULT_PLATFORM_BRANDING.showSubtitle,
    };
  } catch {
    return DEFAULT_PLATFORM_BRANDING;
  }
}

export function savePlatformBranding(config: PlatformBrandingConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLATFORM_BRANDING_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(PLATFORM_BRANDING_EVENT));
}
