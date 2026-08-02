"use client";

import { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/context/I18nContext";

interface MonitorSettingsSectionProps {
  interval: string;
  setInterval: Dispatch<SetStateAction<string>>;
  retries: string;
  setRetries: Dispatch<SetStateAction<string>>;
  retryInterval: string;
  setRetryInterval: Dispatch<SetStateAction<string>>;
  resendInterval: string;
  setResendInterval: Dispatch<SetStateAction<string>>;
}

export function MonitorSettingsSection({
  interval,
  setInterval,
  retries,
  setRetries,
  retryInterval,
  setRetryInterval,
  resendInterval,
  setResendInterval
}: MonitorSettingsSectionProps) {
  const { t } = useI18n();
  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.monitorSettings')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 心跳间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.heartbeatInterval')}</label>
          <div className="flex items-center">
            <input
              type="number"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full px-4 py-2 rounded-l-lg dark:bg-dark-input bg-light-input border border-r-0 border-primary/20 focus:border-primary focus:outline-none"
              min="1"
            />
            <span className="px-4 py-2 rounded-r-lg dark:bg-dark-nav bg-light-nav border border-l-0 border-primary/20">
              {t('common.seconds')}
            </span>
          </div>
          <p className="text-xs text-foreground/50">{t('monitorForm.heartbeatIntervalHint')}</p>
        </div>
        
        {/* 重试次数 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.retries')}</label>
          <input
            type="number"
            value={retries}
            onChange={(e) => setRetries(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            min="0"
          />
          <p className="text-xs text-foreground/50">{t('monitorForm.retriesHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* 心跳重试间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.retryInterval')}</label>
          <div className="flex items-center">
            <input
              type="number"
              value={retryInterval}
              onChange={(e) => setRetryInterval(e.target.value)}
              className="w-full px-4 py-2 rounded-l-lg dark:bg-dark-input bg-light-input border border-r-0 border-primary/20 focus:border-primary focus:outline-none"
              min="1"
            />
            <span className="px-4 py-2 rounded-r-lg dark:bg-dark-nav bg-light-nav border border-l-0 border-primary/20">
              {t('common.seconds')}
            </span>
          </div>
          <p className="text-xs text-foreground/50">{t('monitorForm.retryIntervalHint')}</p>
        </div>
        
        {/* 连续失败发送通知间隔 */}
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.resendInterval')}</label>
          <input
            type="number"
            value={resendInterval}
            onChange={(e) => setResendInterval(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            min="0"
          />
          <p className="text-xs text-foreground/50">
            {parseInt(resendInterval) > 0
              ? t('monitorForm.resendIntervalHintOn', { n: resendInterval })
              : t('monitorForm.resendIntervalHintOff')}
          </p>
        </div>
      </div>
    </div>
  );
}
