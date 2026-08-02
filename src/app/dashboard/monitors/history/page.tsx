"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MonitorHistoryItem, { MonitorStatus } from "@/components/monitor-history-item";
import { useI18n } from "@/context/I18nContext";

interface HistoryItem {
  id: string;
  monitorId: string;
  monitorName: string;
  status: MonitorStatus;
  timestamp: string;
  message: string;
  duration: string;
}

export default function HistoryPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/monitors/history');
        if (response.ok) {
          const data = await response.json();
          setHistoryItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoryData();
  }, []);
  
  const filteredItems = historyItems.filter(item => 
    item.monitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.message.toLowerCase().includes(searchQuery.toLowerCase())
  );
   
  return (
    <div className="pl-80">
      <header className="h-16 flex items-center justify-between px-6 border-b border-primary/10 dark:bg-dark-card/70 bg-light-card/70 backdrop-blur-sm">
        <h1 className="text-xl font-medium">{t('dashboard.historyTitle')}</h1>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-foreground/70 hover:text-primary">
            {t('loginRecords.backToDashboard')}
          </Link>
        </div>
      </header>
      
      <main className="p-6 max-w-7xl mx-auto">
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder={t('dashboard.historySearchPlaceholder')} 
            className="search-input dark:bg-dark-card bg-light-card border border-primary/20 rounded-button px-4 py-2.5 w-full max-w-md focus:outline-none text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-foreground/50"></i>
        </div>
        
        <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 hover:border-primary/30 transition-all shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary/10">
                  <th className="py-3 px-4 text-left text-foreground/70 font-medium">{t('dashboard.historyColStatus')}</th>
                  <th className="py-3 px-4 text-left text-foreground/70 font-medium">{t('dashboard.historyColMonitor')}</th>
                  <th className="py-3 px-4 text-left text-foreground/70 font-medium">{t('dashboard.historyColTime')}</th>
                  <th className="py-3 px-4 text-left text-foreground/70 font-medium">{t('dashboard.historyColDuration')}</th>
                  <th className="py-3 px-4 text-left text-foreground/70 font-medium">{t('dashboard.historyColMessage')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="py-8 text-center text-foreground/50">
                        <i className="fas fa-spinner fa-spin mr-2"></i> {t('common.loading')}
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <MonitorHistoryItem
                      key={item.id}
                      monitorId={item.monitorId}
                      monitorName={item.monitorName}
                      status={item.status}
                      timestamp={item.timestamp}
                      message={item.message}
                      duration={item.duration}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="py-8 text-center text-foreground/50">
                        {t('dashboard.historyNoMatch')}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}