"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";

interface HttpAuthSectionProps {
  monitorType: string;
  requestHeaders: string;
  setRequestHeaders: Dispatch<SetStateAction<string>>;
}

export function HttpAuthSection({
  monitorType,
  requestHeaders,
  setRequestHeaders
}: HttpAuthSectionProps) {
  const { t } = useI18n();
  // HTTP认证状态
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authType, setAuthType] = useState("basic");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  // 解析现有的请求头
  useEffect(() => {
    if (requestHeaders) {
      try {
        const headersObj = JSON.parse(requestHeaders);
        if (headersObj.Authorization) {
          setAuthEnabled(true);
          const authValue = headersObj.Authorization;
          
          if (authValue.startsWith("Basic ")) {
            setAuthType("basic");
            try {
              const decoded = atob(authValue.substring(6));
              const [user, pass] = decoded.split(":");
              setUsername(user || "");
              setPassword(pass || "");
            } catch {
              // 如果解码失败，保持为空
            }
          } else if (authValue.startsWith("Bearer ")) {
            setAuthType("bearer");
            setToken(authValue.substring(7));
          }
        }
              } catch {
          // 如果解析失败，保持默认状态
        }
    }
  }, [requestHeaders]);

  // 更新请求头
  const updateRequestHeaders = (newAuthHeader: string | null) => {
    try {
      let headersObj: Record<string, string> = {};
      if (requestHeaders) {
        headersObj = JSON.parse(requestHeaders);
      }
      
      if (newAuthHeader) {
        headersObj.Authorization = newAuthHeader;
      } else {
        delete headersObj.Authorization;
      }
      
      setRequestHeaders(JSON.stringify(headersObj, null, 2));
    } catch (e) {
      console.error("更新请求头失败:", e);
    }
  };

  // 处理认证类型变化
  const handleAuthTypeChange = (type: string) => {
    setAuthType(type);
    setUsername("");
    setPassword("");
    setToken("");
    updateRequestHeaders(null);
  };

  // 处理用户名密码变化
  const handleBasicAuthChange = (field: "username" | "password", value: string) => {
    if (field === "username") {
      setUsername(value);
    } else {
      setPassword(value);
    }
    
    // 使用当前值而不是状态值，因为状态更新是异步的
    const currentUsername = field === "username" ? value : username;
    const currentPassword = field === "password" ? value : password;
    
    if (currentUsername && currentPassword) {
      const authString = btoa(`${currentUsername}:${currentPassword}`);
      updateRequestHeaders(`Basic ${authString}`);
    } else {
      updateRequestHeaders(null);
    }
  };

  // 处理Bearer Token变化
  const handleTokenChange = (value: string) => {
    setToken(value);
    if (value) {
      updateRequestHeaders(`Bearer ${value}`);
    } else {
      updateRequestHeaders(null);
    }
  };

  // 处理认证开关
  const handleAuthToggle = (enabled: boolean) => {
    setAuthEnabled(enabled);
    if (!enabled) {
      setUsername("");
      setPassword("");
      setToken("");
      updateRequestHeaders(null);
    }
  };

  // 仅对HTTP相关监控类型显示
  if (!["http", "keyword", "https-cert"].includes(monitorType)) {
    return null;
  }

  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">{t('monitorForm.httpAuth')}</h3>
      
      <div className="space-y-4">
        {/* 认证开关 */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="authEnabled"
            checked={authEnabled}
            onChange={(e) => handleAuthToggle(e.target.checked)}
            className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
          />
          <label htmlFor="authEnabled" className="text-foreground/80">
            {t('monitorForm.enableHttpAuth')}
          </label>
        </div>

        {authEnabled && (
          <div className="space-y-4 pl-6">
            {/* 认证类型选择 */}
            <div className="space-y-2">
              <label className="block text-foreground/80 font-medium">{t('monitorForm.authType')}</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="authType"
                    value="basic"
                    checked={authType === "basic"}
                    onChange={(e) => handleAuthTypeChange(e.target.value)}
                    className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
                  />
                  <span className="text-foreground/80">{t('monitorForm.basicAuth')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="authType"
                    value="bearer"
                    checked={authType === "bearer"}
                    onChange={(e) => handleAuthTypeChange(e.target.value)}
                    className="w-4 h-4 text-primary border-primary/30 focus:ring-primary"
                  />
                  <span className="text-foreground/80">{t('monitorForm.bearerToken')}</span>
                </label>
              </div>
            </div>

            {/* Basic认证表单 */}
            {authType === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-foreground/80 font-medium">{t('monitorForm.username')}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleBasicAuthChange("username", e.target.value)}
                    placeholder={t('monitorForm.inputUsername')}
                    className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-foreground/80 font-medium">{t('monitorForm.password')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => handleBasicAuthChange("password", e.target.value)}
                    placeholder={t('monitorForm.inputPassword')}
                    className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Bearer Token表单 */}
            {authType === "bearer" && (
              <div className="space-y-2">
                <label className="block text-foreground/80 font-medium">Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder={t('monitorForm.inputToken')}
                  className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                />
                                 <p className="text-xs text-foreground/50">
                   {t('monitorForm.tokenHint')}
                 </p>
              </div>
            )}

            {/* 提示信息 */}
            <div className="text-xs text-foreground/50 bg-primary/5 p-3 rounded-lg">
              <p className="font-medium mb-1">{t('monitorForm.authInfoTitle')}</p>
              <ul className="space-y-1">
                <li>{t('monitorForm.authInfo1')}</li>
                <li>{t('monitorForm.authInfo2')}</li>
                <li>{t('monitorForm.authInfo3')}</li>
                <li>{t('monitorForm.authInfo4')}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
