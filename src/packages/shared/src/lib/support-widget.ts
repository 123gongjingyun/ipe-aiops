export interface SupportWidgetConfig {
  enabled: boolean;
  buttonLabel: string;
  panelTitle: string;
  panelDescription: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  contactLabel: string;
  contactValue: string;
  footerNote: string;
  qrCodeDataUrl: string | null;
}

export const SUPPORT_WIDGET_STORAGE_KEY = 'ipe_portal_support_widget_v1';
export const SUPPORT_WIDGET_EVENT = 'ipe:portal-support-widget-change';

export const DEFAULT_SUPPORT_WIDGET: SupportWidgetConfig = {
  enabled: true,
  buttonLabel: '在线咨询',
  panelTitle: '服务咨询',
  panelDescription: '提供服务选型、申请路径与参数填写支持，可通过统一渠道联系平台运营团队。',
  primaryActionLabel: '查看帮助中心',
  primaryActionHref: '/portal/#/help',
  contactLabel: '咨询渠道',
  contactValue: '企业微信 / 服务台 / 平台运营群',
  footerNote: '咨询时建议同步提供应用名称、环境、目标能力与期望完成时间。',
  qrCodeDataUrl: null,
};

export function loadSupportWidgetConfig(): SupportWidgetConfig {
  if (typeof window === 'undefined') return DEFAULT_SUPPORT_WIDGET;
  try {
    const raw = window.localStorage.getItem(SUPPORT_WIDGET_STORAGE_KEY);
    if (!raw) return DEFAULT_SUPPORT_WIDGET;
    const parsed = JSON.parse(raw) as Partial<SupportWidgetConfig>;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SUPPORT_WIDGET.enabled,
      buttonLabel: parsed.buttonLabel || DEFAULT_SUPPORT_WIDGET.buttonLabel,
      panelTitle: parsed.panelTitle || DEFAULT_SUPPORT_WIDGET.panelTitle,
      panelDescription: parsed.panelDescription || DEFAULT_SUPPORT_WIDGET.panelDescription,
      primaryActionLabel: parsed.primaryActionLabel || DEFAULT_SUPPORT_WIDGET.primaryActionLabel,
      primaryActionHref: parsed.primaryActionHref || DEFAULT_SUPPORT_WIDGET.primaryActionHref,
      contactLabel: parsed.contactLabel || DEFAULT_SUPPORT_WIDGET.contactLabel,
      contactValue: parsed.contactValue || DEFAULT_SUPPORT_WIDGET.contactValue,
      footerNote: parsed.footerNote || DEFAULT_SUPPORT_WIDGET.footerNote,
      qrCodeDataUrl: parsed.qrCodeDataUrl ?? DEFAULT_SUPPORT_WIDGET.qrCodeDataUrl,
    };
  } catch {
    return DEFAULT_SUPPORT_WIDGET;
  }
}

export function saveSupportWidgetConfig(config: SupportWidgetConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUPPORT_WIDGET_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(SUPPORT_WIDGET_EVENT));
}
