"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/context/I18nContext";

type NotificationType = "邮件" | "Webhook" | "微信推送" | "钉钉推送" | "企业微信推送";

interface NotificationConfig {
  id: string;
  type: NotificationType;
  name: string;
  enabled: boolean;
  defaultForNewMonitors: boolean;
  config: Record<string, unknown>;
}

interface NotificationSettingsProps {
  onNotificationChange?: (hasNotifications: boolean) => void;
}

export function NotificationSettings({ onNotificationChange }: NotificationSettingsProps) {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentEditingNotification, setCurrentEditingNotification] = useState<NotificationConfig | null>(null);
  const [selectedType, setSelectedType] = useState<NotificationType>("邮件");
  const [notificationName, setNotificationName] = useState<string>("");

  // 通知类型显示标签（仅用于展示，匹配仍使用原始中文值）
  const getTypeLabel = (type: string) => {
    switch (type) {
      case '邮件': return t('notifications.email');
      case 'Webhook': return t('notifications.webhook');
      case '微信推送': return t('notifications.wechat');
      case '钉钉推送': return t('notifications.dingtalk');
      case '企业微信推送': return t('notifications.workWechat');
      default: return type;
    }
  };
  
  // 从服务器加载通知设置
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings/notifications');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setNotifications(data.data);
            // 通知父组件是否有通知方式
            if (onNotificationChange) {
              onNotificationChange(data.data.length > 0);
            }
          } else {
            // 如果API返回错误或没有数据，设置为默认值
            setNotifications([
              {
                id: "1",
                type: "邮件",
                name: "系统邮件通知",
                enabled: true,
                defaultForNewMonitors: true,
                config: {
                  email: "",
                  smtpServer: "smtp.example.com",
                  smtpPort: "587",
                  username: "",
                  password: ""
                }
              }
            ]);
            // 通知父组件有默认通知方式
            if (onNotificationChange) {
              onNotificationChange(true);
            }
          }
        } else {
          console.error('加载通知设置失败');
          if (onNotificationChange) {
            onNotificationChange(false);
          }
        }
      } catch (error) {
        console.error('加载通知设置出错:', error);
        if (onNotificationChange) {
          onNotificationChange(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [onNotificationChange]);
  
  // 新增通知配置
  const handleAddNotification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!notificationName.trim()) {
      toast.error(t('notifications.nameEmpty'));
      return;
    }

    try {
      const config = getFormConfig(selectedType as NotificationType);
      const defaultForNewMonitors = document.getElementById('defaultForNewMonitors') as HTMLInputElement;
      const newNotification: Omit<NotificationConfig, 'id'> = {
        name: notificationName,
        type: selectedType as NotificationType,
        enabled: true,
        defaultForNewMonitors: defaultForNewMonitors?.checked || false,
        config,
      };

      // 发送到服务器
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNotification),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 添加到本地状态
          const updatedNotifications = [...notifications, data.data];
          setNotifications(updatedNotifications);
          setIsAddModalOpen(false);
          
          // 重置表单
          resetForm();
          setNotificationName("");
          setSelectedType("邮件");
          
          toast.success(t('notifications.addSuccess'));
          
          // 通知父组件通知方式已添加
          if (onNotificationChange) {
            onNotificationChange(true);
          }
        } else {
          toast.error(`${t('notifications.addFailed')}：${data.message || t('common.unknown')}`);
        }
      } else {
        toast.error(`${t('notifications.addFailed')}：${await response.text()}`);
      }
    } catch (error) {
      console.error("添加通知失败:", error);
      toast.error(t('notifications.addFailed'));
    }
  };
  
  // 编辑通知配置
  const handleEditNotification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!notificationName.trim() || !currentEditingNotification) {
      toast.error(t('notifications.nameEmpty'));
      return;
    }

    try {
      const config = getFormConfig(selectedType as NotificationType);
      const defaultForNewMonitors = document.getElementById('defaultForNewMonitors') as HTMLInputElement;
      const updatedNotification: NotificationConfig = {
        ...currentEditingNotification,
        name: notificationName,
        type: selectedType as NotificationType,
        defaultForNewMonitors: defaultForNewMonitors?.checked || false,
        config,
      };

      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${currentEditingNotification.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNotification),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // 更新本地状态
          const updatedNotifications = notifications.map(n => 
            (n.id === data.data.id ? data.data : n)
          );
          setNotifications(updatedNotifications);
          setCurrentEditingNotification(null);
          
          // 重置表单
          resetForm();
          setNotificationName("");
          setSelectedType("邮件");
          
          toast.success(t('notifications.editSuccess'));
          
          // 通知父组件通知方式仍然存在
          if (onNotificationChange) {
            onNotificationChange(updatedNotifications.length > 0);
          }
        } else {
          toast.error(`${t('notifications.editFailed')}：${data.message || t('common.unknown')}`);
        }
      } else {
        toast.error(`${t('notifications.editFailed')}：${await response.text()}`);
      }
    } catch (error) {
      console.error("更新通知失败:", error);
      toast.error(t('notifications.editFailed'));
    }
  };
  
  // 获取表单配置
  const getFormConfig = (type: NotificationType): Record<string, unknown> => {
    // 从表单获取相应的值
    const form = document.getElementById('notification-form') as HTMLFormElement;
    if (!form) return getDefaultConfig(type);
    
    switch (type) {
      case "邮件": {
        const email = form.querySelector('input[name="email"]') as HTMLInputElement;
        const smtpServer = form.querySelector('input[name="smtpServer"]') as HTMLInputElement;
        const smtpPort = form.querySelector('input[name="smtpPort"]') as HTMLInputElement;
        const username = form.querySelector('input[name="username"]') as HTMLInputElement;
        const password = form.querySelector('input[name="password"]') as HTMLInputElement;
        
        return {
          email: email?.value || "",
          smtpServer: smtpServer?.value || "smtp.example.com",
          smtpPort: smtpPort?.value || "587",
          username: username?.value || "",
          password: password?.value || ""
        };
      }
      case "Webhook": {
        const url = form.querySelector('input[name="webhookUrl"]') as HTMLInputElement;
        const method = form.querySelector('select[name="webhookMethod"]') as HTMLSelectElement;
        const contentType = form.querySelector('select[name="webhookContentType"]') as HTMLSelectElement;
        const headers = form.querySelector('textarea[name="webhookHeaders"]') as HTMLTextAreaElement;
        const bodyTemplate = form.querySelector('textarea[name="webhookBodyTemplate"]') as HTMLTextAreaElement;
        
        // 解析自定义请求头
        const headersObj: Record<string, string> = {};
        if (headers?.value) {
          headers.value.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              const colonIndex = trimmedLine.indexOf(':');
              if (colonIndex > 0) {
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                if (key && value) {
                  headersObj[key] = value;
                }
              }
            }
          });
        }
        
        return {
          url: url?.value || "",
          method: method?.value || "POST",
          contentType: contentType?.value || "application/json",
          headers: headersObj,
          bodyTemplate: bodyTemplate?.value || ""
        };
      }
      case "微信推送": {
        const pushUrl = form.querySelector('input[name="pushUrl"]') as HTMLInputElement;
        return {
          pushUrl: pushUrl?.value || "",
          titleTemplate: "酷监控 - {monitorName} 状态变更",
          contentTemplate: "## 监控状态变更通知\n\n- **监控名称**: {monitorName}\n- **监控类型**: {monitorType}\n- **当前状态**: {status}\n- **变更时间**: {time}\n\n{message}"
        };
      }
      case "钉钉推送": {
        const webhookUrl = form.querySelector('input[name="dingtalkWebhookUrl"]') as HTMLInputElement;
        const secret = form.querySelector('input[name="dingtalkSecret"]') as HTMLInputElement;
        
        return {
          webhookUrl: webhookUrl?.value || "",
          secret: secret?.value || "",
          messageType: "markdown"
        };
      }
      case "企业微信推送": {
        const webhookUrl = form.querySelector('input[name="workWechatWebhookUrl"]') as HTMLInputElement;
        
        return {
          webhookUrl: webhookUrl?.value || ""
        };
      }
      default:
        return {};
    }
  };
  
  // 获取默认配置
  const getDefaultConfig = (type: NotificationType): Record<string, unknown> => {
    switch (type) {
      case "邮件":
        return {
          email: "",
          smtpServer: "smtp.example.com",
          smtpPort: "587",
          username: "",
          password: ""
        };
      case "Webhook":
        return {
          url: "",
          method: "POST",
          contentType: "application/json",
          headers: {},
          bodyTemplate: ""
        };
      case "微信推送":
        return {
          pushUrl: "",
          titleTemplate: "酷监控 - {monitorName} 状态变更",
          contentTemplate: "## 监控状态变更通知\n\n- **监控名称**: {monitorName}\n- **监控类型**: {monitorType}\n- **当前状态**: {status}\n- **变更时间**: {time}\n\n{message}"
        };
      case "钉钉推送":
        return {
          webhookUrl: "",
          secret: "",
          messageType: "markdown"
        };
      case "企业微信推送":
        return {
          webhookUrl: ""
        };
      default:
        return {};
    }
  };
  
  // 打开编辑模态框
  const openEditModal = (notification: NotificationConfig) => {
    setCurrentEditingNotification(notification);
    setSelectedType(notification.type);
    setNotificationName(notification.name);
  };
  
  // 删除通知配置
  const handleDeleteNotification = async (id: string) => {
    try {
      // 发送删除请求到服务器
      const response = await fetch(`/api/settings/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 从本地状态中移除
        const updatedNotifications = notifications.filter(n => n.id !== id);
        setNotifications(updatedNotifications);
        console.log('通知渠道删除成功');
        
        // 通知父组件通知方式是否还存在
        if (onNotificationChange) {
          onNotificationChange(updatedNotifications.length > 0);
        }
      } else {
        console.error('删除通知渠道失败:', await response.text());
      }
    } catch (error) {
      console.error('删除通知渠道时出错:', error);
    }
  };
  
  // 切换通知开关
  const toggleNotificationEnabled = async (id: string) => {
    try {
      // 在本地更新状态
      const updatedNotifications = notifications.map(n => 
        n.id === id ? { ...n, enabled: !n.enabled } : n
      );
      setNotifications(updatedNotifications);
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${id}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // 如果请求失败，恢复为原来的状态
        setNotifications(notifications);
        console.error('切换通知状态失败:', await response.text());
      }
    } catch (error) {
      // 如果出错，恢复为原来的状态
      setNotifications(notifications);
      console.error('切换通知状态时出错:', error);
    }
  };
  
  // 切换通知为默认选项
  const toggleDefaultForNewMonitors = async (id: string) => {
    try {
      // 在本地更新状态
      const updatedNotifications = notifications.map(n => {
        if (n.id === id) {
          return { ...n, defaultForNewMonitors: !n.defaultForNewMonitors };
        }
        // 可选：如果你希望同时只有一个默认通知，则取消其他通知的默认状态
        // if (n.defaultForNewMonitors && n.id !== id) {
        //   return { ...n, defaultForNewMonitors: false };
        // }
        return n;
      });
      setNotifications(updatedNotifications);
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/${id}/default`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        // 如果请求失败，恢复为原来的状态
        setNotifications(notifications);
        console.error('设置默认通知状态失败:', await response.text());
      }
    } catch (error) {
      // 如果出错，恢复为原来的状态
      setNotifications(notifications);
      console.error('设置默认通知状态时出错:', error);
    }
  };
  
  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setCurrentEditingNotification(null);
    setNotificationName("");
    setSelectedType("邮件");
    resetForm();
  };
  
  // 重置表单字段值
  const resetForm = () => {
    const form = document.getElementById('notification-form') as HTMLFormElement;
    if (!form) return;
    
    // 重置邮件表单
    const emailInput = form.querySelector('input[name="email"]') as HTMLInputElement;
    if (emailInput) emailInput.value = "";
    
    const smtpServerInput = form.querySelector('input[name="smtpServer"]') as HTMLInputElement;
    if (smtpServerInput) smtpServerInput.value = "";
    
    const smtpPortInput = form.querySelector('input[name="smtpPort"]') as HTMLInputElement;
    if (smtpPortInput) smtpPortInput.value = "";
    
    const usernameInput = form.querySelector('input[name="username"]') as HTMLInputElement;
    if (usernameInput) usernameInput.value = "";
    
    const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement;
    if (passwordInput) passwordInput.value = "";
    
    // 重置Webhook表单
    const webhookUrlInput = form.querySelector('input[name="webhookUrl"]') as HTMLInputElement;
    if (webhookUrlInput) webhookUrlInput.value = "";

    const webhookMethodSelect = form.querySelector('select[name="webhookMethod"]') as HTMLSelectElement;
    if (webhookMethodSelect) webhookMethodSelect.value = "POST";

    const webhookContentTypeSelect = form.querySelector('select[name="webhookContentType"]') as HTMLSelectElement;
    if (webhookContentTypeSelect) webhookContentTypeSelect.value = "application/json";

    const webhookHeadersTextarea = form.querySelector('textarea[name="webhookHeaders"]') as HTMLTextAreaElement;
    if (webhookHeadersTextarea) webhookHeadersTextarea.value = "";

    const webhookBodyTemplateTextarea = form.querySelector('textarea[name="webhookBodyTemplate"]') as HTMLTextAreaElement;
    if (webhookBodyTemplateTextarea) webhookBodyTemplateTextarea.value = "";
    
    // 重置微信推送表单
    const pushUrlInput = form.querySelector('input[name="pushUrl"]') as HTMLInputElement;
    if (pushUrlInput) pushUrlInput.value = "";
    
    // 重置钉钉推送表单
    const dingtalkWebhookUrlInput = form.querySelector('input[name="dingtalkWebhookUrl"]') as HTMLInputElement;
    if (dingtalkWebhookUrlInput) dingtalkWebhookUrlInput.value = "";
    
    const dingtalkSecretInput = form.querySelector('input[name="dingtalkSecret"]') as HTMLInputElement;
    if (dingtalkSecretInput) dingtalkSecretInput.value = "";
    
    // 重置企业微信推送表单
    const workWechatWebhookUrlInput = form.querySelector('input[name="workWechatWebhookUrl"]') as HTMLInputElement;
    if (workWechatWebhookUrlInput) workWechatWebhookUrlInput.value = "";
  };
  
  // 新增一个测试通知的函数
  const testNotification = async (notification: NotificationConfig) => {
    try {
      toast.loading(t('notifications.sendingTest'));
      
      // 发送到服务器
      const response = await fetch(`/api/settings/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });
      
      toast.dismiss();
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(t('notifications.testSuccess'));
        } else {
          toast.error(`${t('notifications.testFailed')}：${data.message || t('common.unknown')}`);
        }
      } else {
        toast.error(`${t('notifications.testFailed')}：${await response.text()}`);
      }
    } catch (error) {
      toast.dismiss();
      console.error("测试通知失败:", error);
      toast.error(t('notifications.testFailed'));
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary flex flex-col items-center">
          <i className="fas fa-spinner fa-spin fa-2x mb-3"></i>
          <span>{t('notifications.loading')}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-foreground text-light-text-primary">{t('notifications.title')}</h3>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCloseModal();
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center text-sm font-medium"
        >
          <i className="fas fa-plus mr-2"></i>
          {t('notifications.addNotification')}
        </button>
      </div>
      
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-primary/20 rounded-lg bg-primary/5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <i className="fas fa-bell text-2xl"></i>
          </div>
          <p className="text-sm dark:text-foreground/80 text-light-text-secondary mb-4">
            {t('notifications.noConfigHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="border border-primary/10 rounded-lg p-4 bg-dark-nav/30 dark:bg-dark-nav/30 bg-light-nav/30 transition-all hover:border-primary/20"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full ${notification.enabled ? 'bg-primary/20' : 'bg-gray-500/20'} flex items-center justify-center mr-3`}>
                    <i className={`fas ${
                      notification.type === "邮件" ? "fa-envelope" :
                      notification.type === "Webhook" ? "fa-link" :
                      notification.type === "微信推送" ? "fa-weixin" :
                      notification.type === "钉钉推送" ? "fa-bell" :
                      notification.type === "企业微信推送" ? "fa-building" :
                      "fa-paper-plane"
                    } ${notification.enabled ? 'text-primary' : 'text-gray-500'}`}></i>
                  </div>
                  <div>
                    <h4 className="text-md font-medium dark:text-foreground text-light-text-primary">{notification.name}</h4>
                    <p className="text-xs dark:text-foreground/60 text-light-text-secondary">
                      {getTypeLabel(notification.type)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      testNotification(notification);
                    }}
                    className="p-2 rounded-full hover:bg-green-500/10 text-green-400 transition-colors"
                    title={t('notifications.testNotification')}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleDefaultForNewMonitors(notification.id);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      notification.defaultForNewMonitors 
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                        : 'hover:bg-yellow-500/10 text-gray-400'
                    }`}
                    title={notification.defaultForNewMonitors ? t('notifications.defaultSelected') : t('notifications.setDefault')}
                  >
                    <i className="fas fa-star"></i>
                  </button>
                  
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                    <input 
                      type="checkbox" 
                      id={`notification-${notification.id}`} 
                      className="absolute w-0 h-0 opacity-0"
                      checked={notification.enabled}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleNotificationEnabled(notification.id);
                      }}
                    />
                    <label 
                      htmlFor={`notification-${notification.id}`} 
                      className="toggle-label block overflow-hidden h-6 rounded-full bg-primary/30 cursor-pointer"
                    >
                      <span className={`block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out toggle-dot ${notification.enabled ? 'translate-x-6' : ''}`}></span>
                    </label>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openEditModal(notification);
                    }}
                    className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
                  >
                    <i className="fas fa-cog"></i>
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              {notification.enabled && notification.type === "邮件" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>SMTP: {String(notification.config.smtpServer)}:{String(notification.config.smtpPort)}</p>
                  <p>
                    {t('notifications.receiverEmailLabel')}: {String(notification.config.email) || t('common.notSet')}
                  </p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      {t('notifications.defaultForNewMonitors')}
                    </p>
                  )}
                </div>
              )}
              
              {notification.enabled && notification.type === "Webhook" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>Webhook URL: {String(notification.config.url) || t('common.notSet')}</p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      {t('notifications.defaultForNewMonitors')}
                    </p>
                  )}
                </div>
              )}
              
              {notification.enabled && notification.type === "微信推送" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>{t('notifications.pushUrlLabel')}: <span className="font-mono text-xs">{String(notification.config.pushUrl) || t('common.notSet')}</span></p>
                  <p className="mt-1 text-xs dark:text-foreground/60 text-light-text-secondary flex items-center">
                    <i className="fas fa-info-circle mr-1 text-primary"></i>
                    {t('notifications.wechatMdHint')}
                  </p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      {t('notifications.defaultForNewMonitors')}
                    </p>
                  )}
                </div>
              )}
              
              {notification.enabled && notification.type === "钉钉推送" && (
                                 <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                   <p>{t('notifications.webhookAddrLabel')}: <span className="font-mono text-xs">{String(notification.config.webhookUrl) || t('common.notSet')}</span></p>
                   {String(notification.config.secret) && (
                     <p className="mt-1 text-xs text-green-400 flex items-center">
                       <i className="fas fa-shield-alt mr-1"></i>
                       {t('notifications.signedKey')}
                     </p>
                   )}
                   {notification.defaultForNewMonitors && (
                     <p className="mt-1 text-xs text-yellow-400 flex items-center">
                       <i className="fas fa-star mr-1"></i>
                       {t('notifications.defaultForNewMonitors')}
                     </p>
                   )}
                 </div>
              )}
              
              {notification.enabled && notification.type === "企业微信推送" && (
                <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
                  <p>{t('notifications.webhookAddrLabel')}: <span className="font-mono text-xs">{String(notification.config.webhookUrl) || t('common.notSet')}</span></p>
                  {notification.defaultForNewMonitors && (
                    <p className="mt-1 text-xs text-yellow-400 flex items-center">
                      <i className="fas fa-star mr-1"></i>
                      {t('notifications.defaultForNewMonitors')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 添加/编辑通知方式模态框 */}
      {(isAddModalOpen || currentEditingNotification) && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="bg-dark-card dark:bg-dark-card bg-light-card w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-primary/25 animate-fadeIn flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-primary/10 flex-shrink-0">
              <h3 className="text-lg font-medium dark:text-foreground text-light-text-primary">
                {currentEditingNotification ? t('notifications.editTitle') : t('notifications.addTitle')}
              </h3>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="p-2 rounded-full hover:bg-primary/10 dark:text-foreground text-light-text-primary transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div id="notification-form" className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.notificationType')}</label>
                <div className="mt-2 grid grid-cols-5 gap-3">
                  {(["邮件", "Webhook", "微信推送", "钉钉推送", "企业微信推送"] as NotificationType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedType(type);
                      }}
                      className={`px-4 py-2 rounded-lg flex items-center justify-center transition-all ${
                        selectedType === type 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      <i className={`fas ${
                        type === "邮件" ? "fa-envelope" :
                        type === "Webhook" ? "fa-link" :
                        type === "微信推送" ? "fa-weixin" :
                        type === "钉钉推送" ? "fa-bell" :
                        type === "企业微信推送" ? "fa-building" :
                        "fa-paper-plane"
                      } mr-2`}></i>
                      <span>{getTypeLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.notificationName')}</label>
                <input 
                  type="text" 
                  name="notificationName"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="例如: 系统邮件通知"
                  value={notificationName}
                  onChange={(e) => setNotificationName(e.target.value)}
                />
                <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                  {t('notifications.notificationNameHint')}
                </p>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="defaultForNewMonitors"
                  className="w-4 h-4 text-primary bg-dark-nav dark:bg-dark-nav bg-light-nav border-primary/30 rounded focus:ring-primary/30"
                  defaultChecked={currentEditingNotification?.defaultForNewMonitors || true}
                />
                <label 
                  htmlFor="defaultForNewMonitors" 
                  className="ml-2 text-sm dark:text-foreground text-light-text-primary"
                >
                  {t('notifications.defaultForNew')}
                </label>
              </div>
              
              {/* 邮件通知配置项 */}
              {selectedType === "邮件" && (
                <>
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.receiverEmail')}</label>
                    <input 
                      type="email" 
                      name="email"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="example@domain.com"
                      defaultValue={currentEditingNotification?.config?.email as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.smtpServer')}</label>
                    <input 
                      type="text" 
                      name="smtpServer"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="smtp.example.com"
                      defaultValue={currentEditingNotification?.config?.smtpServer as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.smtpPort')}</label>
                    <input 
                      type="text" 
                      name="smtpPort"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="587"
                      defaultValue={currentEditingNotification?.config?.smtpPort as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.smtpUsername')}</label>
                    <input 
                      type="text" 
                      name="username"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="username"
                      defaultValue={currentEditingNotification?.config?.username as string || ""}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.smtpPassword')}</label>
                    <input 
                      type="password" 
                      name="password"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="••••••••"
                      defaultValue={currentEditingNotification?.config?.password as string || ""}
                    />
                  </div>
                </>
              )}
              
              {/* Webhook类型配置表单 */}
              {selectedType === "Webhook" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.webhookUrl')}</label>
                    <input 
                      type="url" 
                      name="webhookUrl"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="https://example.com/webhook"
                      defaultValue={currentEditingNotification?.config?.url as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      {t('notifications.webhookUrlHint')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.httpMethod')}</label>
                      <select 
                        name="webhookMethod"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        defaultValue={currentEditingNotification?.config?.method as string || "POST"}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium dark:text-foreground text-light-text-primary">Content-Type</label>
                      <select 
                        name="webhookContentType"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        defaultValue={currentEditingNotification?.config?.contentType as string || "application/json"}
                      >
                        <option value="application/json">application/json</option>
                        <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                        <option value="text/plain">text/plain</option>
                        <option value="text/xml">text/xml</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.customHeadersOpt')}</label>
                    <textarea 
                      name="webhookHeaders"
                      rows={4}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono text-xs"
                      placeholder={`Authorization: Bearer your-token
X-Custom-Header: custom-value
Content-Type: application/json`}
                      defaultValue={(() => {
                        const headers = currentEditingNotification?.config?.headers as Record<string, string>;
                        if (!headers) return "";
                        return Object.entries(headers)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join('\n');
                      })()}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      {t('notifications.customHeadersHint')}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.bodyTemplateOpt')}</label>
                    <textarea 
                      name="webhookBodyTemplate"
                      rows={8}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono text-xs"
                      placeholder={`{
  "text": "监控项 {monitorName} 状态变更为 {status}",
  "attachments": [{
    "title": "监控详情",
    "text": "{message}"
  }]
}`}
                      defaultValue={currentEditingNotification?.config?.bodyTemplate as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      {t('notifications.bodyTemplateHint')}
                    </p>
                  </div>
                  
                  {/* 变量说明 */}
                  <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">{t('notifications.availableVars')}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-mono text-primary">{`{monitorName}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varMonitorName')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{monitorType}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varMonitorType')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{status}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varStatus')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{statusCode}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varStatusCode')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{time}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varTime')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{message}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varMessage')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{failureCount}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varFailureCount')}</span>
                      </div>
                      <div>
                        <span className="font-mono text-primary">{`{failureDuration}`}</span>
                        <span className="ml-2 dark:text-foreground/70 text-light-text-secondary">{t('notifications.varFailureDuration')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 平台示例 */}
                  <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">{t('notifications.platformExamples')}</h3>
                    <div className="space-y-3">
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium dark:text-foreground text-light-text-primary">{t('notifications.feishuRobot')}</summary>
                        <div className="mt-2 p-2 bg-dark-nav/50 dark:bg-dark-nav/50 rounded text-xs">
                          <p className="mb-2"><strong>Content-Type:</strong> application/json</p>
                          <p className="mb-2"><strong>请求体模板:</strong></p>
                          <pre className="whitespace-pre-wrap">{`{
  "msg_type": "text",
  "content": {
    "text": "【{monitorName}】状态变更为：{status}\\n消息：{message}\\n时间：{time}"
  }
}`}</pre>
                        </div>
                      </details>
                      
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium dark:text-foreground text-light-text-primary">{t('notifications.dingtalkRobot')}</summary>
                        <div className="mt-2 p-2 bg-dark-nav/50 dark:bg-dark-nav/50 rounded text-xs">
                          <p className="mb-2"><strong>Content-Type:</strong> application/json</p>
                          <p className="mb-2"><strong>请求体模板:</strong></p>
                          <pre className="whitespace-pre-wrap">{`{
  "msgtype": "markdown",
  "markdown": {
    "title": "监控告警",
    "text": "## 监控状态变更\\n\\n**监控名称**: {monitorName}\\n**状态**: {status}\\n**时间**: {time}\\n\\n{message}"
  }
}`}</pre>
                        </div>
                      </details>
                      
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium dark:text-foreground text-light-text-primary">{t('notifications.workWechatRobot')}</summary>
                        <div className="mt-2 p-2 bg-dark-nav/50 dark:bg-dark-nav/50 rounded text-xs">
                          <p className="mb-2"><strong>Content-Type:</strong> application/json</p>
                          <p className="mb-2"><strong>请求体模板:</strong></p>
                          <pre className="whitespace-pre-wrap">{`{
  "msgtype": "markdown",
  "markdown": {
    "content": "## 监控状态变更\\n\\n**监控名称**: {monitorName}\\n**状态**: {status}\\n**时间**: {time}\\n\\n{message}"
  }
}`}</pre>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 微信推送配置项 */}
              {selectedType === "微信推送" && (
                <div>
                  <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.wechatUrl')}</label>
                  <input 
                    type="url" 
                    name="pushUrl"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="https://push.showdoc.com.cn/xxxxxx"
                    defaultValue={currentEditingNotification?.config?.pushUrl as string || ""}
                  />
                  <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                    {t('notifications.wechatUrlHint')}
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-primary/5">
                    <div className="flex items-center text-xs dark:text-foreground/70 text-light-text-secondary mb-2">
                      <i className="fas fa-info-circle text-primary mr-2"></i>
                      <span>{t('notifications.wechatUsageTitle')}</span>
                    </div>
                    <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-1">
                      <li>{t('notifications.wechatUsage1')}</li>
                      <li>{t('notifications.wechatUsage2')}</li>
                      <li>{t('notifications.wechatUsage3')}</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* 钉钉推送配置项 */}
              {selectedType === "钉钉推送" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.dingtalkUrl')}</label>
                    <input 
                      type="url" 
                      name="dingtalkWebhookUrl"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxxxxx"
                      defaultValue={currentEditingNotification?.config?.webhookUrl as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      请输入钉钉群机器人的Webhook地址
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.dingtalkSecret')}</label>
                    <input 
                      type="password" 
                      name="dingtalkSecret"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="SEC开头的加签密钥"
                      defaultValue={currentEditingNotification?.config?.secret as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      如果机器人启用了加签验证，请填入加签密钥
                    </p>
                  </div>

                  {/* 添加钉钉机器人配置说明 */}
                  <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">钉钉群机器人配置说明</h3>
                                         <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-2">
                       <li>在钉钉群中添加&ldquo;自定义机器人&rdquo;</li>
                       <li>安全设置选择&ldquo;加签&rdquo;方式（推荐）或&ldquo;自定义关键词&rdquo;</li>
                       <li>如选择加签方式，请将生成的密钥填入上方&ldquo;加签密钥&rdquo;字段</li>
                       <li>如选择关键词方式，请添加&ldquo;酷监控&rdquo;作为关键词</li>
                       <li>复制Webhook地址到上方URL字段</li>
                     </ol>
                    <div className="mt-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <p className="text-xs text-orange-400 flex items-center">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        注意：请确保机器人安全设置正确配置，否则可能无法正常发送消息
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 企业微信推送配置项 */}
              {selectedType === "企业微信推送" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium dark:text-foreground text-light-text-primary">{t('notifications.workWechatUrl')}</label>
                    <input 
                      type="url" 
                      name="workWechatWebhookUrl"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxx"
                      defaultValue={currentEditingNotification?.config?.webhookUrl as string || ""}
                    />
                    <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
                      {t('notifications.workWechatUrlHint')}
                    </p>
                  </div>

                  {/* 添加企业微信机器人配置说明 */}
                  <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">企业微信群机器人配置说明</h3>
                                         <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-2">
                       <li>在企业微信群聊中添加&ldquo;群机器人&rdquo;</li>
                       <li>选择&ldquo;自定义机器人&rdquo;类型</li>
                       <li>复制生成的Webhook地址到上方URL字段</li>
                       <li>企业微信机器人无需额外的签名验证</li>
                     </ol>
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-blue-400 flex items-center">
                        <i className="fas fa-info-circle mr-2"></i>
                        企业微信机器人支持Markdown格式消息，可以显示丰富的状态信息
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-5 bg-dark-nav/50 dark:bg-dark-nav/50 bg-light-nav/50 border-t border-primary/10 flex-shrink-0">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseModal();
                }}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors mr-3"
              >
                {t('common.cancel')}
              </button>
              
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const config = getFormConfig(selectedType as NotificationType);
                  const testNotificationObj: NotificationConfig = {
                    id: currentEditingNotification?.id || "temp-" + Date.now(),
                    name: notificationName || "测试通知",
                    type: selectedType as NotificationType,
                    enabled: true,
                    defaultForNewMonitors: currentEditingNotification?.defaultForNewMonitors || true,
                    config,
                  };
                  testNotification(testNotificationObj);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-3 flex items-center"
                disabled={!notificationName.trim()}
              >
                <i className="fas fa-paper-plane mr-2"></i>
                {t('notifications.testNotification')}
              </button>
              
              <button 
                onClick={currentEditingNotification ? handleEditNotification : handleAddNotification}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {currentEditingNotification ? t('common.save') : t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 