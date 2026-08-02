"use client";

import { Dispatch, SetStateAction } from "react";
import { HttpAuthSection } from "./HttpAuthSection";
import { useI18n } from "@/context/I18nContext";

interface AdvancedOptionsSectionProps {
  monitorType: string;
  httpMethod: string;
  setHttpMethod: Dispatch<SetStateAction<string>>;
  statusCodes: string;
  setStatusCodes: Dispatch<SetStateAction<string>>;
  requestBody: string;
  setRequestBody: Dispatch<SetStateAction<string>>;
  requestHeaders: string;
  setRequestHeaders: Dispatch<SetStateAction<string>>;
  ignoreTls: boolean;
  setIgnoreTls: Dispatch<SetStateAction<boolean>>;
  maxRedirects: string;
  setMaxRedirects: Dispatch<SetStateAction<string>>;
  connectTimeout: string;
  setConnectTimeout: Dispatch<SetStateAction<string>>;
  upsideDown: boolean;
  setUpsideDown: Dispatch<SetStateAction<boolean>>;
  notifyCertExpiry: boolean;
  setNotifyCertExpiry: Dispatch<SetStateAction<boolean>>;
}

export function AdvancedOptionsSection({
  monitorType,
  httpMethod,
  setHttpMethod,
  statusCodes,
  setStatusCodes,
  requestBody,
  setRequestBody,
  requestHeaders,
  setRequestHeaders,
  ignoreTls,
  setIgnoreTls,
  maxRedirects,
  setMaxRedirects,
  connectTimeout,
  setConnectTimeout,
  upsideDown,
  setUpsideDown,
  notifyCertExpiry,
  setNotifyCertExpiry
}: AdvancedOptionsSectionProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      {/* HTTP认证选项 */}
      {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
        <HttpAuthSection
          monitorType={monitorType}
          requestHeaders={requestHeaders}
          setRequestHeaders={setRequestHeaders}
        />
      )}
      
      {/* HTTP选项 */}
      {(monitorType === "http" || monitorType === "keyword") && (
        <div className="p-5 border border-primary/10 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.httpOptions')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 方法 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.requestMethod')}</label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            
            {/* 有效状态码 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.validStatusCodes')}</label>
              <input
                type="text"
                value={statusCodes}
                onChange={(e) => setStatusCodes(e.target.value)}
                placeholder={t('monitorForm.statusCodesPlaceholder')}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-foreground/50">
                {t('monitorForm.statusCodesHint')}
              </p>
            </div>
            
            {/* 连接超时 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.connectTimeout')}</label>
              <input
                type="number"
                value={connectTimeout}
                onChange={(e) => setConnectTimeout(e.target.value)}
                placeholder="10"
                min="1"
                max="300"
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-foreground/50">
                {t('monitorForm.connectTimeoutHint')}
              </p>
            </div>
          </div>
          
          <div className="mt-6 space-y-6">
            {/* 请求体 */}
            {httpMethod !== "GET" && httpMethod !== "HEAD" && (
              <div className="space-y-2">
                <label className="block text-foreground/80 font-medium">{t('monitorForm.requestBody')}</label>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
                  placeholder={t('monitorForm.requestBodyPlaceholder')}
                ></textarea>
              </div>
            )}
            
            {/* 请求头 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.customHeaders')}</label>
              <textarea
                value={requestHeaders}
                onChange={(e) => setRequestHeaders(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
                placeholder={t('monitorForm.customHeadersPlaceholder')}
              ></textarea>
              <p className="text-xs text-foreground/50">
                {t('monitorForm.customHeadersHint')}
              </p>
            </div>
            
            {/* HTTPS证书到期通知选项 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyCertExpiry"
                checked={notifyCertExpiry}
                onChange={(e) => setNotifyCertExpiry(e.target.checked)}
                className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
              />
              <label htmlFor="notifyCertExpiry" className="text-foreground/80">
                {t('monitorForm.notifyCertExpiry')}
              </label>
            </div>
            <p className="text-xs text-foreground/50 pl-6">{t('monitorForm.notifyCertExpiryHint')}</p>
          </div>
        </div>
      )}
      
      {/* HTTPS证书选项 */}
      {monitorType === "https-cert" && (
        <div className="p-5 border border-primary/10 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.httpsCertTitle')}</h3>
          <p className="text-sm text-foreground/70 mb-4">
            {t('monitorForm.httpsCertDesc')}
          </p>
        </div>
      )}
      
      {/* ICMP Ping选项 */}
      {monitorType === "icmp" && (
        <div className="p-5 border border-primary/10 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.icmpOptions')}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ping包数量 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.pingCount')}</label>
              <select
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                defaultValue="4"
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
                <option value="16">16</option>
              </select>
              <p className="text-xs text-foreground/50">
                {t('monitorForm.pingCountHint')}
              </p>
            </div>
            
            {/* 最大允许丢包率 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.maxPacketLoss')}</label>
              <select
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                defaultValue="0"
              >
                <option value="0">{t('monitorForm.noPacketLoss')}</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
              </select>
              <p className="text-xs text-foreground/50">
                {t('monitorForm.maxPacketLossHint')}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            {/* 最大响应时间 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.maxResponseTime')}</label>
              <input
                type="number"
                placeholder={t('monitorForm.maxResponseTimePlaceholder')}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                min="1"
              />
              <p className="text-xs text-foreground/50">
                {t('monitorForm.maxResponseTimeHint')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 高级选项 */}
      <div className="p-5 border border-primary/10 rounded-lg">
        <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.advancedOptions')}</h3>
        
        <div className="space-y-4">
          {/* TLS/SSL 选项 - 仅适用于 HTTP/HTTPS 和关键字监控 */}
          {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ignoreTls"
                checked={ignoreTls}
                onChange={(e) => setIgnoreTls(e.target.checked)}
                className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
              />
              <label htmlFor="ignoreTls" className="text-foreground/80">
                {monitorType === "https-cert"
                  ? t('monitorForm.ignoreTlsCert')
                  : t('monitorForm.ignoreTlsHttp')}
              </label>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="upsideDown"
              checked={upsideDown}
              onChange={(e) => setUpsideDown(e.target.checked)}
              className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
            />
            <label htmlFor="upsideDown" className="text-foreground/80">
              {t('monitorForm.upsideDown')}
            </label>
          </div>
          <p className="text-xs text-foreground/50 pl-6">{t('monitorForm.upsideDownHint')}</p>
          
          {/* 最大重定向次数 */}
          {(monitorType === "http" || monitorType === "keyword" || monitorType === "https-cert") && (
            <div className="mt-4 md:w-1/2">
              <label className="block text-foreground/80 font-medium mb-2">{t('monitorForm.maxRedirects')}</label>
              <input
                type="number"
                value={maxRedirects}
                onChange={(e) => setMaxRedirects(e.target.value)}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                min="0"
              />
              <p className="text-xs text-foreground/50 mt-1">{t('monitorForm.maxRedirectsHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
