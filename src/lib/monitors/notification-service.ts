import axios from 'axios';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { formatDateTime } from './utils';
import { getServerTranslator, type Locale } from '@/lib/i18n';

// 通知语言：默认中文，可根据用户偏好动态确定
type NotifyLocale = Locale;

// 状态描述（根据语言返回）
function getStatusText(status: number, locale: NotifyLocale): string {
  const t = getServerTranslator(locale);
  if (status === 0) return t('notification.statusDown');
  if (status === 1) return t('notification.statusUp');
  if (status === 2) return t('notification.statusPending');
  return t('common.unknown');
}

// 通知数据接口
interface NotificationData {
  monitorName: string;
  monitorType: string;
  status: string; // 状态描述
  statusText: string; // 状态中文描述
  statusCode: number; // 状态码: 1=正常, 0=异常, 2=等待
  time: string;
  message: string;
  failureCount?: number;
  firstFailureTime?: string;
  lastFailureTime?: string;
  failureDuration?: number;
}

// 邮件配置接口
interface EmailConfig {
  email: string;
  smtpServer: string;
  smtpPort: string | number;
  username?: string;
  password?: string;
}

// Webhook配置接口
interface WebhookConfig {
  url: string;
  method?: string; // HTTP方法，默认POST
  headers?: Record<string, string>; // 自定义请求头
  bodyTemplate?: string; // 请求体模板，支持变量占位符
  contentType?: string; // Content-Type，默认application/json
}

// 微信推送配置接口
interface WechatConfig {
  pushUrl: string;
  titleTemplate?: string;
  contentTemplate?: string;
}

// 钉钉推送配置接口
interface DingTalkConfig {
  webhookUrl: string;
  secret?: string;
}

// 企业微信推送配置接口
interface WorkWechatConfig {
  webhookUrl: string;
}

// 内存缓存，记录每个监控项"上一次真正成功送达"的通知状态与时间。
// 关键约束：只有发送成功才更新此缓存，发送失败绝不更新。
// 这样当某次通知发送失败时，下一轮检查会自动重试，避免出现
// “网站恢复了却永远收不到恢复通知”的问题。
const notificationCache = new Map<string, { time: number; status: number }>();

// 通知绑定关系（含已加载的通知渠道）的最小结构类型
interface NotificationBindingWithChannel {
  notificationChannel: {
    enabled: boolean;
    name: string;
    type: string;
    config: unknown;
  };
}

/**
 * 构建基础通知数据（含监控地址信息）
 */
function buildNotificationData(
  monitor: { name: string; type: string; config: unknown },
  status: number,
  message: string,
  locale: NotifyLocale
): NotificationData {
  const t = getServerTranslator(locale);
  const addrLabel = t('notification.monitorAddress');
  const notificationData: NotificationData = {
    monitorName: monitor.name,
    monitorType: monitor.type,
    status: getStatusText(status, locale),
    statusText: getStatusText(status, locale),
    statusCode: status,
    time: formatDateTime(),
    message: message || t('notification.noDetail')
  };

  if (monitor.config) {
    try {
      const monitorConfig = monitor.config as Record<string, unknown>;
      if (monitorConfig.url) {
        notificationData.message = `${addrLabel}: ${String(monitorConfig.url)}\n${notificationData.message}`;
      } else if (monitorConfig.hostname) {
        const address = monitorConfig.port
          ? `${String(monitorConfig.hostname)}:${String(monitorConfig.port)}`
          : String(monitorConfig.hostname);
        notificationData.message = `${addrLabel}: ${address}\n${notificationData.message}`;
      }
    } catch (error) {
      console.error("处理监控配置信息出错:", error);
    }
  }

  return notificationData;
}

/**
 * 向所有启用的通知渠道发送通知。
 * @returns 是否至少有一个渠道发送成功（用于决定是否更新送达缓存）
 */
async function notifyChannels(
  bindings: NotificationBindingWithChannel[] | null | undefined,
  data: NotificationData,
  locale: NotifyLocale
): Promise<boolean> {
  if (!bindings || bindings.length === 0) {
    return false;
  }

  let anySuccess = false;
  for (const binding of bindings) {
    const channel = binding.notificationChannel;
    if (!channel?.enabled) continue;

    try {
      const config = (channel.config as Record<string, unknown>) || {};
      await sendNotification(channel.type, config, data, locale);
      anySuccess = true;
    } catch (error) {
      console.error(`向 ${channel.name}(${channel.type}) 发送通知失败:`, error);
    }
  }

  return anySuccess;
}

/**
 * 处理监控状态变更通知
 * @param monitorId 监控项ID
 * @param status 监控状态 (0-异常, 1-正常, 2-等待)
 * @param message 状态消息
 * @param prevStatus 先前状态 (可能为空，表示第一次检查)；仅作为缓存冷启动时的回退推断
 * @param options.standalone 独立通知（如证书到期提醒），不参与上下线状态机去重、不读写送达缓存
 */
export async function sendStatusChangeNotifications(
  monitorId: string,
  status: number,
  message: string,
  prevStatus: number | null,
  options?: { standalone?: boolean }
) {
  try {
    // 获取监控项详情
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: {
        createdBy: {
          select: { preferredLanguage: true }
        },
        notificationBindings: {
          where: { enabled: true },
          include: {
            notificationChannel: true
          }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 2 // 只获取最近2条记录，用于判断状态变化
        }
      }
    });

    if (!monitor) {
      console.error(`找不到监控项: ${monitorId}`);
      return;
    }

    // 如果没有启用的通知配置，则不发送
    if (!monitor.notificationBindings || monitor.notificationBindings.length === 0) {
      return;
    }

    // 根据监控项创建者的偏好语言确定通知语言
    const locale: NotifyLocale = monitor.createdBy?.preferredLanguage === 'en' ? 'en' : 'zh';
    const t = getServerTranslator(locale);

    // 检查是否为新添加的监控项（状态历史记录数量小于等于1）
    const isNewMonitor = !monitor.statusHistory || monitor.statusHistory.length <= 1;

    const now = Date.now();
    const lastNotification = notificationCache.get(monitorId);
    // 缓存冷启动（如进程重启、或监控项从未成功送达过任何通知）。
    // 此时历史/prevStatus 只能“尽力推断”上次送达状态，无法可靠用于抑制发送；
    // 因此 Down 分支在冷启动时不做抑制，确保故障告警一定能尝试送达并在失败后自动重试。
    const cacheCold = !lastNotification;

    // 确定上一次“已送达”的通知状态，作为去重与恢复判断的唯一可靠依据。
    // 正常运行时以内存缓存为准（它只记录真正发送成功的状态）；
    // 仅在缓存冷启动（如进程重启）时，回退到状态历史 / prevStatus 做尽力推断。
    let lastNotifiedStatus: number | undefined = lastNotification?.status;
    if (cacheCold) {
      if (!isNewMonitor && monitor.statusHistory && monitor.statusHistory.length > 1) {
        const histPrev = monitor.statusHistory[1]?.status;
        if (histPrev !== undefined && histPrev !== null) {
          lastNotifiedStatus = histPrev;
        }
      }
      if (lastNotifiedStatus === undefined && prevStatus !== null && prevStatus !== undefined) {
        lastNotifiedStatus = prevStatus;
      }
    }

    // 准备基础通知数据（含监控地址信息）
    const notificationData = buildNotificationData(monitor, status, message, locale);

    // 独立通知（如证书到期提醒）：不参与上下线状态机的去重，也不读写送达缓存，
    // 避免污染监控项正常的故障 / 恢复通知流程。
    if (options?.standalone) {
      await notifyChannels(monitor.notificationBindings, notificationData, locale);
      return;
    }

    // 如果是新监控项，且状态为正常，则不发送通知
    if (isNewMonitor && status === 1) {
      return;
    }

    if (status === 0) {
      // —— 故障通知 ——
      // 已成功送达过故障通知（且缓存非冷启动）时，按 resendInterval 决定是否重复提醒；
      // 否则视为新故障，发送。冷启动时不抑制，确保故障告警能送达并支持失败重试。
      if (!cacheCold && lastNotifiedStatus === 0) {
        if (monitor.resendInterval > 0 && lastNotification) {
          // 获取自上次通知之后的连续失败次数（不包含上次通知时的那次失败）
          const failuresSinceLastNotification = await prisma.monitorStatus.count({
            where: {
              monitorId,
              status: 0,
              timestamp: {
                gt: new Date(lastNotification.time) // 使用 gt 而不是 gte，排除上次通知的时间点
              }
            }
          });

          // 如果失败次数未达到重复通知间隔，则不发送通知
          if (failuresSinceLastNotification < monitor.resendInterval) {
            return;
          }
        } else {
          // 未设置重复通知间隔（为0），且已送达过故障通知，不重复发送
          return;
        }
      }

      // 查找最近一次成功状态的时间，以确定连续失败的起始点
      const lastSuccess = await prisma.monitorStatus.findFirst({
        where: {
          monitorId,
          status: 1
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      const continuousFailureStartTime = lastSuccess?.timestamp || new Date(0);

      // 获取连续失败的总次数
      const totalFailures = await prisma.monitorStatus.count({
        where: {
          monitorId,
          status: 0,
          timestamp: {
            gt: continuousFailureStartTime
          }
        }
      });

      // 获取第一次连续失败的时间
      const firstContinuousFailure = await prisma.monitorStatus.findFirst({
        where: {
          monitorId,
          status: 0,
          timestamp: {
            gt: continuousFailureStartTime
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      // 计算失败持续时间
      const duration = firstContinuousFailure
        ? Math.floor((now - firstContinuousFailure.timestamp.getTime()) / 1000 / 60)
        : 0;

      // 扩展通知数据
      const aggregatedData = {
        ...notificationData,
        failureCount: totalFailures,
        firstFailureTime: firstContinuousFailure ? formatDateTime(firstContinuousFailure.timestamp) : t('common.unknown'),
        lastFailureTime: formatDateTime(),
        failureDuration: duration,
        message: `${t('notification.failureSummary', { count: totalFailures, firstTime: firstContinuousFailure ? formatDateTime(firstContinuousFailure.timestamp) : t('common.unknown'), duration: String(duration) })}\n${notificationData.message}`
      };

      // 仅当至少一个渠道发送成功时，才把缓存更新为“已送达故障”。
      // 发送失败则缓存保持不变，下一轮检查会自动重试，确保故障告警不丢失。
      if (await notifyChannels(monitor.notificationBindings, aggregatedData, locale)) {
        notificationCache.set(monitorId, { time: now, status: 0 });
      }
    } else if (status === 1) {
      // —— 恢复通知 ——
      // 仅当之前确实送达过故障通知（lastNotifiedStatus === 0）时才发送恢复通知。
      // 若上一次恢复通知发送失败，缓存仍停留在 0，因此下一轮检查会自动重试，
      // 确保用户一定能收到恢复通知。
      if (lastNotifiedStatus !== 0) {
        // 持续正常、或从未送达过故障通知，均无需发送恢复通知
        return;
      }

      // 获取恢复前的失败时长
      const recoverDuration = lastNotification
        ? Math.floor((now - lastNotification.time) / 1000 / 60)
        : 0;

      // 增强恢复通知内容
      const recoveryData = {
        ...notificationData,
        message: `${t('notification.recoveryMessage', { duration: recoverDuration > 0 ? t('notification.failureDurationMsg', { duration: String(recoverDuration) }) : '' })}\n${notificationData.message}`
      };

      // 仅当发送成功时才更新缓存为“已送达恢复”，失败则下轮重试
      if (await notifyChannels(monitor.notificationBindings, recoveryData, locale)) {
        notificationCache.set(monitorId, { time: now, status: 1 });
      }
    } else {
      // —— 其他状态（如 PENDING）——
      if (await notifyChannels(monitor.notificationBindings, notificationData, locale)) {
        notificationCache.set(monitorId, { time: now, status });
      }
    }
  } catch (error) {
    console.error(`处理监控 ${monitorId} 状态变更通知时出错:`, error);
  }
}

/**
 * 根据不同的通知类型发送通知
 */
async function sendNotification(
  type: string,
  config: Record<string, unknown>,
  data: NotificationData,
  locale: NotifyLocale
) {
  switch (type) {
    case '邮件':
      // 转换并验证配置
      const emailConfig: EmailConfig = {
        email: String(config.email || ''),
        smtpServer: String(config.smtpServer || ''),
        smtpPort: config.smtpPort as string || '587',
        username: config.username as string,
        password: config.password as string
      };
      return await sendEmailNotification(emailConfig, data, locale);
    case 'Webhook':
      // 转换并验证配置
      const webhookConfig: WebhookConfig = {
        url: String(config.url || ''),
        method: config.method as string,
        headers: config.headers as Record<string, string>,
        bodyTemplate: config.bodyTemplate as string,
        contentType: config.contentType as string
      };
      return await sendWebhookNotification(webhookConfig, data, locale);
    case '微信推送':
      // 转换并验证配置
      const wechatConfig: WechatConfig = {
        pushUrl: String(config.pushUrl || ''),
        titleTemplate: config.titleTemplate as string,
        contentTemplate: config.contentTemplate as string
      };
      return await sendWechatNotification(wechatConfig, data, locale);
    case '钉钉推送':
      // 转换并验证配置
      const dingtalkConfig: DingTalkConfig = {
        webhookUrl: String(config.webhookUrl || ''),
        secret: config.secret as string
      };
      return await sendDingTalkNotification(dingtalkConfig, data, locale);
    case '企业微信推送':
      // 转换并验证配置
      const workWechatConfig: WorkWechatConfig = {
        webhookUrl: String(config.webhookUrl || '')
      };
      return await sendWorkWechatNotification(workWechatConfig, data, locale);
    default:
      throw new Error(`不支持的通知类型: ${type}`);
  }
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(
  config: EmailConfig,
  data: NotificationData,
  locale: NotifyLocale
) {
  const { email, smtpServer, smtpPort, username, password } = config;
  const t = getServerTranslator(locale);

  if (!email || !smtpServer || !smtpPort) {
    throw new Error('邮件配置不完整');
  }

  // 创建传输器
  const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: username || email,
      pass: password
    }
  });

  // 构建邮件内容
  const subject = t('notification.emailSubject', { name: data.monitorName, status: data.statusText });
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #6366F1; border-radius: 10px;">
      <h2 style="color: #6366F1;">🔔 ${t('notification.emailTitle')}</h2>
      <div style="background-color: ${data.statusCode === 1 ? '#10B981' : '#EF4444'}1a; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0; color: ${data.statusCode === 1 ? '#10B981' : '#EF4444'}; font-weight: bold; font-size: 16px;">
          ${t('notification.emailStatus')}: ${data.statusText}
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">${t('notification.emailMonitorName')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">${data.monitorName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">${t('notification.emailMonitorType')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.monitorType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">${t('notification.emailChangeTime')}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${data.time}</td>
        </tr>
      </table>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0; white-space: pre-line;">${data.message}</p>
      </div>
      <hr style="border-top: 1px solid #EEE; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">${t('notification.emailFooter')}</p>
    </div>
  `;

  // 发送邮件
  await transporter.sendMail({
    from: username || email,
    to: email,
    subject,
    html
  });
}

/**
 * 发送Webhook通知
 */
export async function sendWebhookNotification(
  config: WebhookConfig,
  data: NotificationData,
  locale: NotifyLocale
) {
  const { url, method = 'POST', headers, bodyTemplate, contentType = 'application/json' } = config;
  const t = getServerTranslator(locale);
  const addrLabel = t('notification.monitorAddress');

  if (!url) {
    throw new Error('Webhook URL不能为空');
  }

  // 向后兼容性日志
  console.log(`Webhook配置: URL=${url}, Method=${method}, ContentType=${contentType}, 自定义模板=${!!bodyTemplate}, 自定义请求头=${!!headers}`);

  // 准备webhook数据
  const webhookData = {
    event: 'status_change',
    timestamp: new Date().toISOString(),
    monitor: {
      name: data.monitorName,
      type: data.monitorType,
      status: data.statusText,  // 状态描述（根据语言）
      status_code: data.statusCode, // 使用数字状态码
      time: data.time,
      message: data.message,
      address: null as string | null // 初始化地址字段为null
    },
    // 额外字段用于失败状态
    failure_info: data.failureCount ? {
      count: data.failureCount,
      first_failure_time: data.firstFailureTime,
      last_failure_time: data.lastFailureTime,
      duration_minutes: data.failureDuration
    } : null
  };

  // 从消息中提取监控地址信息并添加到webhook数据中
  const addressMatch = data.message.match(new RegExp(`${addrLabel}:\\s*(.*?)(?:\\n|$)`));
  if (addressMatch && addressMatch[1]) {
    webhookData.monitor.address = addressMatch[1];
  }

  // 处理请求体
  let requestBody: string | Record<string, unknown>;
  if (bodyTemplate) {
    // 使用自定义模板，替换变量
    let body = bodyTemplate;
    Object.entries(data).forEach(([key, value]) => {
      // 对变量值进行JSON转义，只转义真正的控制字符
      const escapedValue = String(value)
        .replace(/\\/g, '\\\\')  // 反斜杠
        .replace(/"/g, '\\"')    // 双引号
        .replace(/\n/g, '\\n')   // 换行符
        .replace(/\r/g, '\\r')   // 回车符
        .replace(/\t/g, '\\t');  // 制表符
      // 移除其他控制字符的转义，避免过度转义
      
      body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), escapedValue);
    });
    
    // 根据Content-Type处理请求体
    if (contentType === 'application/json') {
      try {
        let jsonBody = body;
        // 去除尾部逗号等常见JSON格式问题
        jsonBody = jsonBody.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(jsonBody);
        if (typeof parsed === 'object' && parsed !== null) {
          requestBody = parsed;
        } else {
          console.warn('JSON模板解析结果不是对象，尝试包装为对象');
          requestBody = body;
        }
      } catch (error) {
        console.error('自定义JSON模板解析失败，使用原始字符串:', error);
        console.error('原始模板:', body);
        requestBody = body;
      }
    } else {
      requestBody = body;
    }
  } else {
    // 使用默认数据结构
    requestBody = webhookData;
  }

  // 根据Content-Type设置请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'User-Agent': 'CoolMonitor-Notification-Service'
  };
  if (headers) {
    Object.assign(requestHeaders, headers);
  }
  
  console.log(`发送Webhook通知: URL=${url}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  console.log(`Webhook数据: ${JSON.stringify(requestBody)}`);
  
  try {
    // 发送webhook请求
    const response = await axios({
      url,
      method,
      headers: requestHeaders,
      data: requestBody,
      timeout: 10000
    });
    
    console.log(`Webhook通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Webhook通知发送失败，服务器响应: 状态码=${error.response.status}, 数据=${JSON.stringify(error.response.data)}, 监控项=${data.monitorName}`);
      } else if (error.request) {
        console.error(`Webhook通知发送失败，无响应: ${error.message}, 监控项=${data.monitorName}`);
      } else {
        console.error(`Webhook通知发送失败，请求配置错误: ${error.message}, 监控项=${data.monitorName}`);
      }
    } else {
      console.error(`Webhook通知发送失败，未知错误: ${error}, 监控项=${data.monitorName}`);
    }
    throw error;
  }
}

/**
 * 发送微信推送通知
 */
async function sendWechatNotification(
  config: WechatConfig,
  data: NotificationData,
  locale: NotifyLocale
) {
  const { pushUrl, titleTemplate, contentTemplate } = config;
  const t = getServerTranslator(locale);

  if (!pushUrl) {
    throw new Error('微信推送URL不能为空');
  }

  // 替换模板中的变量
  let title = titleTemplate || t('notification.emailSubject', { name: '{monitorName}', status: '{statusText}' });
  let content = contentTemplate ||
    `## ${t('notification.mdTitle')}\n\n` +
    `- **${t('notification.mdMonitorName')}**: {monitorName}\n` +
    `- **${t('notification.mdMonitorType')}**: {monitorType}\n` +
    `- **${t('notification.mdCurrentStatus')}**: {statusText}\n` +
    `- **${t('notification.mdChangeTime')}**: {time}\n` +
    (data.failureCount ?
      `- **${t('notification.mdFailureCount')}**: {failureCount} ${t('notification.mdTimes')}\n` +
      `- **${t('notification.mdFirstFailureTime')}**: {firstFailureTime}\n` +
      `- **${t('notification.mdLastFailureTime')}**: {lastFailureTime}\n` +
      `- **${t('notification.mdFailureDuration')}**: {failureDuration} ${t('notification.mdMinutes')}\n\n` : "\n") +
    "{message}";

  // 替换所有模板变量
  Object.entries(data).forEach(([key, value]) => {
    title = title.replace(new RegExp(`{${key}}`, 'g'), String(value));
    content = content.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  // 发送微信推送请求
  await axios.post(pushUrl, {
    title,
    content
  }, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });
}

/**
 * 发送钉钉推送通知
 */
async function sendDingTalkNotification(
  config: DingTalkConfig,
  data: NotificationData,
  locale: NotifyLocale
) {
  const { webhookUrl, secret } = config;
  const messageType = 'markdown'; // 固定使用markdown格式
  const t = getServerTranslator(locale);

  if (!webhookUrl) {
    throw new Error('钉钉Webhook URL不能为空');
  }

  // 构建消息内容
  let content = '';
  const title = t('notification.emailSubject', { name: data.monitorName, status: data.statusText });

  // 使用Markdown消息格式
  content = `## 🔔 ${t('notification.mdTitle')}\n\n` +
    `- **${t('notification.mdMonitorName')}**: ${data.monitorName}\n` +
    `- **${t('notification.mdMonitorType')}**: ${data.monitorType}\n` +
    `- **${t('notification.mdCurrentStatus')}**: <font color="${data.statusCode === 1 ? '#10B981' : '#EF4444'}">${data.statusText}</font>\n` +
    `- **${t('notification.mdChangeTime')}**: ${data.time}\n`;

  if (data.failureCount) {
    content += `- **${t('notification.mdFailureCount')}**: ${data.failureCount} ${t('notification.mdTimes')}\n` +
      `- **${t('notification.mdFirstFailureTime')}**: ${data.firstFailureTime}\n` +
      `- **${t('notification.mdLastFailureTime')}**: ${data.lastFailureTime}\n` +
      `- **${t('notification.mdFailureDuration')}**: ${data.failureDuration} ${t('notification.mdMinutes')}\n`;
  }

  content += `\n**${t('notification.mdDetail')}**:\n\n${data.message}`;
  
  // 构建钉钉消息体
  interface DingTalkMessageBody {
    msgtype: string;
    text?: {
      content: string;
    };
    markdown?: {
      title: string;
      text: string;
    };
    at: {
      atMobiles: string[];
      atUserIds: string[];
      isAtAll: boolean;
    };
  }
  
  const messageBody: DingTalkMessageBody = {
    msgtype: messageType,
    markdown: {
      title: title,
      text: content
    },
    at: {
      atMobiles: [],
      atUserIds: [],
      isAtAll: false
    }
  };
  
  // 如果配置了加签密钥，则生成签名
  let finalUrl = webhookUrl;
  if (secret) {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${secret}`;
    const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
    const encodedSign = encodeURIComponent(sign);
    finalUrl = `${webhookUrl}&timestamp=${timestamp}&sign=${encodedSign}`;
  }
  
  console.log(`发送钉钉通知: URL=${webhookUrl}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  console.log(`钉钉消息数据: ${JSON.stringify(messageBody)}`);
  
  try {
    // 发送钉钉推送请求
    const response = await axios.post(finalUrl, messageBody, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-DingTalk-Notification'
      },
      timeout: 10000
    });
    
    console.log(`钉钉通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    
    // 检查钉钉API返回的结果
    if (response.data && response.data.errcode !== 0) {
      throw new Error(`钉钉API返回错误: ${response.data.errmsg || '未知错误'}`);
    }
    
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`钉钉通知发送失败，服务器响应: 状态码=${error.response.status}, 数据=${JSON.stringify(error.response.data)}, 监控项=${data.monitorName}`);
      } else if (error.request) {
        console.error(`钉钉通知发送失败，无响应: ${error.message}, 监控项=${data.monitorName}`);
      } else {
        console.error(`钉钉通知发送失败，请求配置错误: ${error.message}, 监控项=${data.monitorName}`);
      }
    } else {
      console.error(`钉钉通知发送失败，未知错误: ${error}, 监控项=${data.monitorName}`);
    }
    throw error;
  }
}

/**
 * 发送企业微信推送通知
 */
async function sendWorkWechatNotification(
  config: WorkWechatConfig,
  data: NotificationData,
  locale: NotifyLocale
) {
  const { webhookUrl } = config;
  const t = getServerTranslator(locale);

  if (!webhookUrl) {
    throw new Error('企业微信Webhook URL不能为空');
  }

  // 构建企业微信消息内容
  const content = {
    msgtype: "markdown",
    markdown: {
      content: `## 🔔 ${t('notification.mdTitle')}\n\n` +
        `**${t('notification.mdMonitorName')}**: ${data.monitorName}\n` +
        `**${t('notification.mdMonitorType')}**: ${data.monitorType}\n` +
        `**${t('notification.mdCurrentStatus')}**: <font color="${data.statusCode === 1 ? 'info' : 'warning'}">${data.statusText}</font>\n` +
        `**${t('notification.mdChangeTime')}**: ${data.time}\n` +
        (data.failureCount ?
          `**${t('notification.mdFailureCount')}**: ${data.failureCount} ${t('notification.mdTimes')}\n` +
          `**${t('notification.mdFirstFailureTime')}**: ${data.firstFailureTime}\n` +
          `**${t('notification.mdLastFailureTime')}**: ${data.lastFailureTime}\n` +
          `**${t('notification.mdFailureDuration')}**: ${data.failureDuration} ${t('notification.mdMinutes')}\n` : '') +
        `\n**${t('notification.mdDetail')}**: ${data.message}`
    }
  };
  
  console.log(`发送企业微信通知: URL=${webhookUrl}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  console.log(`企业微信消息数据: ${JSON.stringify(content)}`);
  
  try {
    // 发送企业微信推送请求
    const response = await axios.post(webhookUrl, content, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-WorkWechat-Notification'
      },
      timeout: 10000
    });
    
    console.log(`企业微信通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    
    // 检查企业微信API返回结果
    if (response.data && response.data.errcode !== 0) {
      throw new Error(`企业微信API返回错误: ${response.data.errmsg || '未知错误'}`);
    }
    
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`企业微信通知发送失败，服务器响应: 状态码=${error.response.status}, 数据=${JSON.stringify(error.response.data)}, 监控项=${data.monitorName}`);
      } else if (error.request) {
        console.error(`企业微信通知发送失败，无响应: ${error.message}, 监控项=${data.monitorName}`);
      } else {
        console.error(`企业微信通知发送失败，请求配置错误: ${error.message}, 监控项=${data.monitorName}`);
      }
    } else {
      console.error(`企业微信通知发送失败，未知错误: ${error}, 监控项=${data.monitorName}`);
    }
    throw error;
  }
}
