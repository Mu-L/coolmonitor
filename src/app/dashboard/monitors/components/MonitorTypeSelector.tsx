"use client";

import { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/context/I18nContext";

interface MonitorTypeSelectorProps {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
}

export function MonitorTypeSelector({ value, onChange }: MonitorTypeSelectorProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <label className="block text-foreground/80 font-medium">{t('monitorType.label') + ' *'}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
        data-testid="monitor-type-select"
      >
        <optgroup label={t('monitorType.groupRegular')}>
          <option value="http">{t('monitorType.httpWebsite')}</option>
          <option value="https-cert">{t('monitorType.httpsCert')}</option>
          <option value="port">TCP Port</option>
          <option value="keyword">{t('monitorType.keyword')}</option>
          <option value="icmp">ICMP Ping</option>
        </optgroup>
        <optgroup label={t('monitorType.groupPassive')}>
          <option value="push">Push</option>
        </optgroup>
        <optgroup label={t('monitorType.groupDatabase')}>
          <option value="mysql">MySQL/MariaDB</option>
          <option value="redis">Redis</option>
        </optgroup>
      </select>
    </div>
  );
}
