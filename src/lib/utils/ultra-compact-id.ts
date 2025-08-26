/**
 * ID生成器 - 使用标准UUID策略
 * 为了确保唯一性和稳定性，使用标准的UUID v4生成方式
 * 不再追求极致的紧凑性，而是优先保证无冲突
 */

import { randomUUID } from 'crypto';

/**
 * 生成标准UUID v4
 * 使用Node.js内置的crypto.randomUUID()，确保高质量随机性
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * 生成短UUID（22位）
 * 基于UUID v4，但使用base64编码压缩长度
 * 保持UUID的唯一性，但长度更短
 */
export function generateShortUUID(): string {
  const uuid = randomUUID();
  // 移除连字符
  const cleanUuid = uuid.replace(/-/g, '');
  // 转换为base64，移除填充字符
  const base64 = Buffer.from(cleanUuid, 'hex').toString('base64');
  // 移除base64中的+和/，替换为URL安全的字符
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 生成紧凑UUID（16位）
 * 使用时间戳+随机数的组合，但增加更多随机性
 * 格式：TTTTTTTT + RRRRRRRR
 * - T: 8位时间戳（基于相对时间）
 * - R: 8位随机数
 */
export function generateCompactUUID(): string {
  const BASE_TIME = new Date('2024-01-01T00:00:00Z').getTime();
  const now = Date.now();
  const relativeTime = now - BASE_TIME;
  
  // 8位时间戳（36进制）
  const timeCode = relativeTime.toString(36).padStart(8, '0').slice(-8);
  
  // 8位随机数（36进制）
  const randomCode = Math.random().toString(36).substring(2, 10);
  
  return timeCode + randomCode;
}

/**
 * 默认ID生成器
 * 使用标准UUID，确保最大兼容性和唯一性
 */
export function generateUltraCompactId(): string {
  return generateUUID();
}

/**
 * 兼容性函数 - 保持原有接口
 */
export function generateUltraCompactId6(): string {
  return generateCompactUUID();
}

export function generateUltraCompactId7(): string {
  return generateCompactUUID();
}

export function generateUltraCompactId8(): string {
  return generateShortUUID();
}

export function generateUltraCompactId9(): string {
  return generateShortUUID();
}

export function generateUltraCompactIdWithRetry(): string {
  // 对于UUID，理论上不需要重试，但保留接口兼容性
  return generateUUID();
}

/**
 * 验证ID格式
 */
export function isUltraCompactId(id: string): boolean {
  // 支持多种格式：UUID、短UUID、紧凑UUID
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || // 标准UUID
         /^[0-9a-zA-Z_-]{22}$/.test(id) || // 短UUID
         /^[0-9a-z]{16}$/.test(id); // 紧凑UUID
}

/**
 * 从ID中提取时间信息（仅对紧凑UUID有效）
 */
export function extractTimeFromUltraCompactId(id: string): Date | null {
  if (!isUltraCompactId(id)) {
    return null;
  }
  
  try {
    // 如果是紧凑UUID格式
    if (/^[0-9a-z]{16}$/.test(id)) {
      const BASE_TIME = new Date('2024-01-01T00:00:00Z').getTime();
      const timeCode = id.substring(0, 8);
      const relativeTime = parseInt(timeCode, 36);
      return new Date(BASE_TIME + relativeTime);
    }
    
    // 如果是标准UUID，无法提取时间信息
    return null;
  } catch {
    return null;
  }
}

/**
 * 计算ID碰撞风险（对于UUID，风险极低）
 */
export function calculateCollisionRisk(idLength: number, recordsPerDay: number): {
  dailyRisk: number;
  yearlyRisk: number;
  threeYearRisk: number;
} {
  // UUID的碰撞概率极低，几乎可以忽略
  const uuidSpace = Math.pow(2, 122); // UUID v4的有效位数
  const dailyCombinations = recordsPerDay * (recordsPerDay - 1) / 2;
  
  // 使用生日悖论公式
  const dailyRisk = 1 - Math.exp(-dailyCombinations / uuidSpace);
  const yearlyRisk = 1 - Math.pow(1 - dailyRisk, 365);
  const threeYearRisk = 1 - Math.pow(1 - dailyRisk, 365 * 3);
  
  return {
    dailyRisk: dailyRisk * 100,
    yearlyRisk: yearlyRisk * 100,
    threeYearRisk: threeYearRisk * 100
  };
}

/**
 * 获取生成器统计信息
 */
export function getGeneratorStats(): {
  cacheSize: number;
  maxCacheSize: number;
  collisionRate: number;
} {
  return {
    cacheSize: 0, // UUID不需要缓存
    maxCacheSize: 0,
    collisionRate: 0 // UUID碰撞率极低
  };
}
