import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
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
        toast.error('仅支持Excel文件(.xlsx, .xls)');
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
        throw new Error('下载模板失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '监控项导入模板.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('模板下载成功');
    } catch (error) {
      console.error('下载模板失败:', error);
      toast.error('下载模板失败，请稍后重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('请选择要导入的Excel文件');
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
        throw new Error(data.error || '导入失败');
      }

      setUploadResult(data.results);
      
      if (data.results.success > 0) {
        toast.success(`成功导入 ${data.results.success} 条监控项`);
        if (onSuccess) {
          onSuccess();
        }
      }
      
      if (data.results.failed > 0) {
        toast.error(`导入失败 ${data.results.failed} 条，请查看详情`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      toast.error(error instanceof Error ? error.message : '导入失败，请稍后重试');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isMounted || !isOpen) return null;

  const content = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center overflow-y-auto">
      <div className="dark:bg-dark-card bg-light-card rounded-lg border border-primary/15 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 dark:bg-dark-card bg-light-card border-b border-primary/10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">导入监控项</h2>
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
                导入说明
              </h3>
              <ul className="text-sm text-foreground/70 space-y-1 list-disc list-inside">
                <li>请先下载模板，按照模板格式填写数据</li>
                <li>支持导入 .xlsx 和 .xls 格式的Excel文件</li>
                <li>监控名称和监控类型为必填项</li>
                <li>根据监控类型填写相应的必填字段（如URL、主机名等）</li>
                <li>如果分组不存在，系统会自动创建新分组</li>
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
                下载导入模板
              </button>
            </div>

            {/* 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                选择Excel文件
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
                  已选择: {file.name}
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
                    <span className="font-medium text-foreground">导入结果</span>
                  </div>
                  <div className="text-sm text-foreground/70 space-y-1">
                    <div>成功: <span className="text-success font-medium">{uploadResult.success}</span> 条</div>
                    <div>失败: <span className="text-error font-medium">{uploadResult.failed}</span> 条</div>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <div className="max-h-60 overflow-y-auto">
                    <div className="text-sm font-medium text-foreground mb-2">错误详情:</div>
                    <div className="space-y-2">
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} className="text-xs bg-error/10 border border-error/20 rounded p-2">
                          <span className="font-medium">第 {error.row} 行:</span> {error.error}
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
              关闭
            </button>
            <button 
              type="submit"
              className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-2 rounded-button hover:opacity-90 shadow-glow-sm transition-all flex items-center"
              disabled={isUploading || !file}
            >
              {isUploading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin mr-2"></i>
                  导入中...
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  开始导入
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
