"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";
import { useI18n } from "@/context/I18nContext";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const { t, locale } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setUploadResult(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error(t('importDialog.excelOnly'));
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/monitors/template');
      if (!response.ok) {
        throw new Error(t('importDialog.downloadFailed'));
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = locale === 'en' ? 'coolmonitor-template.xlsx' : '监控项导入模板.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(t('importDialog.templateDownloaded'));
    } catch (error) {
      console.error('下载模板失败:', error);
      toast.error(t('importDialog.downloadFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error(t('importDialog.selectFile'));
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/monitors/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('importDialog.importFailed'));
      }

      setUploadResult(data.results);
      
      if (data.results.success > 0) {
        toast.success(t('importDialog.importSuccess', { n: data.results.success }));
        if (onSuccess) {
          onSuccess();
        }
      }
      
      if (data.results.failed > 0) {
        toast.error(t('importDialog.importFailedCount', { n: data.results.failed }));
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast.error(error instanceof Error ? error.message : t('importDialog.importFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isMounted || !isOpen) return null;

  const content = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto">
      <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 dark:bg-dark-card bg-light-card border-b border-primary/10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">{t('importDialog.title')}</h2>
          <button 
            onClick={onClose}
            className="text-foreground/70 hover:text-foreground"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
          
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* 说明 */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">
                <i className="fas fa-info-circle mr-2"></i>
                {t('importDialog.importInstructions')}
              </h3>
              <ul className="text-sm text-foreground/70 space-y-1 list-disc list-inside">
                <li>{t('importDialog.instruction1')}</li>
                <li>{t('importDialog.instruction2')}</li>
                <li>{t('importDialog.instruction3')}</li>
                <li>{t('importDialog.instruction4')}</li>
                <li>{t('importDialog.instruction5')}</li>
              </ul>
            </div>

            {/* 下载模板按钮 */}
            <div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2 border border-primary/30 rounded-button text-foreground hover:bg-primary/5 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-download mr-2"></i>
                {t('importDialog.downloadTemplate')}
              </button>
            </div>

            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('importDialog.selectExcel')}
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-primary/30 rounded-button text-foreground bg-transparent focus:outline-none focus:border-primary"
                disabled={isUploading}
              />
              {file && (
                <p className="mt-2 text-sm text-foreground/70">
                  <i className="fas fa-file-excel mr-2"></i>
                  {t('importDialog.selected', { name: file.name })}
                </p>
              )}
            </div>

            {/* 导入结果 */}
            {uploadResult && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  uploadResult.failed === 0 
                    ? 'bg-success/10 border-success/20' 
                    : 'bg-warning/10 border-warning/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{t('importDialog.importResult')}</span>
                  </div>
                  <div className="text-sm text-foreground/70 space-y-1">
                    <div>{t('importDialog.successCount', { n: uploadResult.success })}</div>
                    <div>{t('importDialog.failedCount', { n: uploadResult.failed })}</div>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    <div className="text-sm font-medium text-foreground mb-2">{t('importDialog.errorDetails')}</div>
                    <div className="space-y-2">
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} className="text-xs bg-error/10 border border-error/20 rounded p-2">
                          <span className="font-medium">{t('importDialog.rowN', { n: error.row })}</span> {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        
          {/* 底部操作按钮 */}
          <div className="sticky bottom-0 z-10 dark:bg-dark-card bg-light-card border-t border-primary/10 px-6 py-4 flex justify-between items-center">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-primary/30 rounded-button text-foreground hover:bg-primary/5 transition-colors"
              disabled={isUploading}
            >
              {t('common.close')}
            </button>
            <button 
              type="submit"
              className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-2 rounded-button hover:opacity-90 shadow-glow-sm transition-all flex items-center"
              disabled={isUploading || !file}
            >
              {isUploading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin mr-2"></i>
                  {t('importDialog.importing')}
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  {t('importDialog.startImport')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
