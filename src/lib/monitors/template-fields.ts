import type { Locale } from '@/lib/i18n';

// 导入/导出模板字段定义
// 每个字段包含中英文表头和内部 key，导入时按别名匹配
export interface TemplateField {
  key: string;        // 内部字段名
  zh: string;         // 中文表头
  en: string;         // 英文表头
  width?: number;     // 列宽
}

// 监控项模板字段列表（顺序即列顺序）
export const TEMPLATE_FIELDS: TemplateField[] = [
  { key: 'name',              zh: '监控名称',      en: 'Monitor Name',         width: 20 },
  { key: 'type',              zh: '监控类型',      en: 'Monitor Type',         width: 14 },
  { key: 'url',               zh: 'URL',           en: 'URL',                  width: 30 },
  { key: 'hostname',          zh: '主机名',        en: 'Hostname',             width: 20 },
  { key: 'port',              zh: '端口',          en: 'Port',                 width: 8 },
  { key: 'keyword',           zh: '关键字',        en: 'Keyword',              width: 15 },
  { key: 'interval',          zh: '检查间隔(秒)',  en: 'Interval (sec)',       width: 15 },
  { key: 'retries',           zh: '重试次数',      en: 'Retries',              width: 10 },
  { key: 'retryInterval',     zh: '重试间隔(秒)',  en: 'Retry Interval (sec)', width: 15 },
  { key: 'resendInterval',    zh: '重发间隔(秒)',  en: 'Resend Interval (sec)',width: 15 },
  { key: 'active',            zh: '是否启用',      en: 'Enabled',              width: 10 },
  { key: 'upsideDown',        zh: '反向监控',      en: 'Upside Down',          width: 12 },
  { key: 'description',       zh: '描述',          en: 'Description',          width: 20 },
  { key: 'groupName',         zh: '分组名称',      en: 'Group Name',           width: 15 },
  { key: 'httpMethod',        zh: 'HTTP方法',      en: 'HTTP Method',          width: 12 },
  { key: 'statusCodes',       zh: '状态码范围',    en: 'Status Codes',         width: 15 },
  { key: 'maxRedirects',      zh: '最大重定向次数',en: 'Max Redirects',        width: 15 },
  { key: 'connectTimeout',    zh: '连接超时(秒)',  en: 'Connect Timeout (sec)',width: 15 },
  { key: 'ignoreTls',         zh: '忽略TLS错误',   en: 'Ignore TLS',           width: 12 },
  { key: 'notifyCertExpiry',  zh: '通知证书到期',  en: 'Notify Cert Expiry',   width: 15 },
  { key: 'username',          zh: '用户名',        en: 'Username',             width: 15 },
  { key: 'password',          zh: '密码',          en: 'Password',             width: 15 },
  { key: 'database',          zh: '数据库名',      en: 'Database',             width: 15 },
  { key: 'query',             zh: '查询语句',      en: 'Query / Command',      width: 20 },
  { key: 'requestBody',       zh: '请求体',        en: 'Request Body',         width: 20 },
  { key: 'requestHeaders',    zh: '请求头',        en: 'Request Headers',      width: 20 },
];

// 根据语言返回对应的表头文字
export function getFieldHeader(field: TemplateField, locale: Locale): string {
  return locale === 'en' ? field.en : field.zh;
}

// 构建"Excel表头 → 内部 key"的反向查找表（同时支持中英文表头和内部 key）
// 导入时用这个表把任意表头解析为统一的内部字段名
export function buildHeaderResolver(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of TEMPLATE_FIELDS) {
    // 中文表头、英文表头、内部 key 三种都映射到同一个内部 key
    map[field.zh] = field.key;
    map[field.en] = field.key;
    map[field.key] = field.key;
  }
  return map;
}

// 示例数据
export function getSampleData(locale: Locale): Record<string, string | number | boolean>[] {
  if (locale === 'en') {
    return [
      {
        'Monitor Name': 'Example Website',
        'Monitor Type': 'http',
        'URL': 'https://example.com',
        'Hostname': '', 'Port': '', 'Keyword': '',
        'Interval (sec)': 60, 'Retries': 0, 'Retry Interval (sec)': 60, 'Resend Interval (sec)': 0,
        'Enabled': true, 'Upside Down': false,
        'Description': 'Example monitor', 'Group Name': '',
        'HTTP Method': 'GET', 'Status Codes': '200-299', 'Max Redirects': 10, 'Connect Timeout (sec)': 10,
        'Ignore TLS': false, 'Notify Cert Expiry': false,
        'Username': '', 'Password': '', 'Database': '', 'Query / Command': '',
        'Request Body': '', 'Request Headers': '',
      },
      {
        'Monitor Name': 'Example Port',
        'Monitor Type': 'port',
        'URL': '',
        'Hostname': 'example.com', 'Port': 80, 'Keyword': '',
        'Interval (sec)': 60, 'Retries': 0, 'Retry Interval (sec)': 60, 'Resend Interval (sec)': 0,
        'Enabled': true, 'Upside Down': false,
        'Description': '', 'Group Name': '',
        'HTTP Method': '', 'Status Codes': '', 'Max Redirects': '', 'Connect Timeout (sec)': '',
        'Ignore TLS': '', 'Notify Cert Expiry': '',
        'Username': '', 'Password': '', 'Database': '', 'Query / Command': '',
        'Request Body': '', 'Request Headers': '',
      },
    ];
  }
  return [
    {
      '监控名称': '示例网站监控',
      '监控类型': 'http',
      'URL': 'https://example.com',
      '主机名': '', '端口': '', '关键字': '',
      '检查间隔(秒)': 60, '重试次数': 0, '重试间隔(秒)': 60, '重发间隔(秒)': 0,
      '是否启用': true, '反向监控': false,
      '描述': '示例监控项', '分组名称': '',
      'HTTP方法': 'GET', '状态码范围': '200-299', '最大重定向次数': 10, '连接超时(秒)': 10,
      '忽略TLS错误': false, '通知证书到期': false,
      '用户名': '', '密码': '', '数据库名': '', '查询语句': '',
      '请求体': '', '请求头': '',
    },
    {
      '监控名称': '示例端口监控',
      '监控类型': 'port',
      'URL': '',
      '主机名': 'example.com', '端口': 80, '关键字': '',
      '检查间隔(秒)': 60, '重试次数': 0, '重试间隔(秒)': 60, '重发间隔(秒)': 0,
      '是否启用': true, '反向监控': false,
      '描述': '', '分组名称': '',
      'HTTP方法': '', '状态码范围': '', '最大重定向次数': '', '连接超时(秒)': '',
      '忽略TLS错误': '', '通知证书到期': '',
      '用户名': '', '密码': '', '数据库名': '', '查询语句': '',
      '请求体': '', '请求头': '',
    },
  ];
}
