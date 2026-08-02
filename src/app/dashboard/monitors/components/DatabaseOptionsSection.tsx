"use client";

import { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/context/I18nContext";

interface DatabaseOptionsSectionProps {
  monitorType: string;
  username: string;
  setUsername: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  database: string;
  setDatabase: Dispatch<SetStateAction<string>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
}

export function DatabaseOptionsSection({
  monitorType,
  username,
  setUsername,
  password,
  setPassword,
  database,
  setDatabase,
  query,
  setQuery
}: DatabaseOptionsSectionProps) {
  const { t } = useI18n();

  if (!["mysql", "redis"].includes(monitorType)) {
    return null;
  }

  return (
    <div className="p-5 border border-primary/10 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-primary">
        {monitorType === "redis" ? t('monitorForm.redisOptions') : t('monitorForm.dbOptions')}
      </h3>
      
      {/* Redis 不需要用户名/数据库名 */}
      {monitorType !== "redis" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-foreground/80 font-medium">{t('monitorForm.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-foreground/80 font-medium">{t('monitorForm.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}
      
      {/* Redis 只需要密码 */}
      {monitorType === "redis" && (
        <div className="space-y-2">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-foreground/50">{t('monitorForm.redisPasswordHint')}</p>
        </div>
      )}
      
      {/* 数据库名称 - 对于MySQL */}
      {monitorType === "mysql" && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.dbName')}</label>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-foreground/50">
            {t('monitorForm.dbNameHint')}
          </p>
        </div>
      )}
      
      {/* 查询 - 对于MySQL */}
      {monitorType === "mysql" && (
        <div className="space-y-2 mt-6">
          <label className="block text-foreground/80 font-medium">{t('monitorForm.testQuery')}</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none h-24 font-mono text-sm"
            placeholder={`SELECT 1;`}
          ></textarea>
          <p className="text-xs text-foreground/50">
            {t('monitorForm.testQueryHint')}
          </p>
        </div>
      )}
      
      {/* Redis特有选项 */}
      {monitorType === "redis" && (
        <div className="space-y-2 mt-6">
          <div className="mt-4">
            <label className="block text-foreground/80 font-medium mb-2">{t('monitorForm.redisCommand')}</label>
            <input
              type="text"
              placeholder="PING"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
            />
            <p className="text-xs text-foreground/50 mt-1">
              {t('monitorForm.redisCommandHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
