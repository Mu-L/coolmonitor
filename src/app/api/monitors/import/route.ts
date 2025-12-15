import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { validateAuth } from '@/lib/auth-helpers';
import { monitorOperations } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/monitors/import - 导入Excel文件
export async function POST(request: NextRequest) {
  try {
    // 验证用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请选择要导入的Excel文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: '仅支持Excel文件(.xlsx, .xls)' },
        { status: 400 }
      );
    }

    // 读取文件
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Excel文件中没有数据' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    // 记录本次导入成功创建的监控 ID，方便导入完成后统一调度
    const createdMonitorIds: string[] = [];

    // 获取所有分组，用于匹配分组名称
    const groups = await prisma.monitorGroup.findMany({
      where: { createdById: session.user.id }
    });
    const groupMap = new Map(groups.map(g => [g.name, g.id]));

    // 处理每一行数据
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      const rowNumber = i + 2; // Excel行号（从2开始，第1行是标题）

      try {
        // 验证必填字段
        const name = String(row['监控名称'] || row['name'] || '').trim();
        const type = String(row['监控类型'] || row['type'] || '').trim().toLowerCase();

        if (!name) {
          results.errors.push({ row: rowNumber, error: '监控名称不能为空' });
          results.failed++;
          continue;
        }

        if (!type) {
          results.errors.push({ row: rowNumber, error: '监控类型不能为空' });
          results.failed++;
          continue;
        }

        // 验证监控类型
        const validTypes = ['http', 'keyword', 'https-cert', 'port', 'mysql', 'redis', 'icmp', 'push'];
        if (!validTypes.includes(type)) {
          results.errors.push({ row: rowNumber, error: `无效的监控类型: ${type}，支持的类型: ${validTypes.join(', ')}` });
          results.failed++;
          continue;
        }

        // 构建config对象
        const config: Record<string, any> = {};

        // 根据监控类型设置不同的配置
        if (['http', 'keyword', 'https-cert'].includes(type)) {
          const url = String(row['URL'] || row['url'] || '').trim();
          if (!url) {
            results.errors.push({ row: rowNumber, error: `${type}类型监控需要URL字段` });
            results.failed++;
            continue;
          }
          config.url = url;

          if (type === 'https-cert' && !url.startsWith('https://')) {
            results.errors.push({ row: rowNumber, error: 'HTTPS证书监控必须使用HTTPS URL' });
            results.failed++;
            continue;
          }

          if (['http', 'keyword'].includes(type)) {
            config.httpMethod = String(row['HTTP方法'] || row['httpMethod'] || 'GET').trim().toUpperCase();
            config.statusCodes = String(row['状态码范围'] || row['statusCodes'] || '200-299').trim();
          }

          config.maxRedirects = parseInt(String(row['最大重定向次数'] || row['maxRedirects'] || '10')) || 10;
          config.connectTimeout = parseInt(String(row['连接超时(秒)'] || row['connectTimeout'] || '10')) || 10;
          config.ignoreTls = String(row['忽略TLS错误'] || row['ignoreTls'] || 'false').toLowerCase() === 'true';
          
          if (type === 'http') {
            config.notifyCertExpiry = String(row['通知证书到期'] || row['notifyCertExpiry'] || 'false').toLowerCase() === 'true';
          }

          if (type === 'keyword') {
            const keyword = String(row['关键字'] || row['keyword'] || '').trim();
            if (!keyword) {
              results.errors.push({ row: rowNumber, error: '关键字监控需要关键字字段' });
              results.failed++;
              continue;
            }
            config.keyword = keyword;
          }

          const requestBody = String(row['请求体'] || row['requestBody'] || '').trim();
          const requestHeaders = String(row['请求头'] || row['requestHeaders'] || '').trim();
          if (requestBody) config.requestBody = requestBody;
          if (requestHeaders) config.requestHeaders = requestHeaders;
        }

        if (['port', 'mysql', 'redis'].includes(type)) {
          const hostname = String(row['主机名'] || row['hostname'] || '').trim();
          const port = String(row['端口'] || row['port'] || '').trim();
          
          if (!hostname) {
            results.errors.push({ row: rowNumber, error: `${type}类型监控需要主机名字段` });
            results.failed++;
            continue;
          }
          if (!port || isNaN(parseInt(port))) {
            results.errors.push({ row: rowNumber, error: `${type}类型监控需要有效的端口字段` });
            results.failed++;
            continue;
          }

          config.hostname = hostname;
          config.port = parseInt(port);

          if (['mysql', 'redis'].includes(type)) {
            config.username = String(row['用户名'] || row['username'] || '').trim();
            config.password = String(row['密码'] || row['password'] || '').trim();
            config.query = String(row['查询语句'] || row['query'] || '').trim();
            
            if (type === 'mysql') {
              config.database = String(row['数据库名'] || row['database'] || '').trim();
            }
          }
        }

        if (type === 'icmp') {
          const hostname = String(row['主机名'] || row['hostname'] || '').trim();
          if (!hostname) {
            results.errors.push({ row: rowNumber, error: 'ICMP监控需要主机名字段' });
            results.failed++;
            continue;
          }
          config.hostname = hostname;
          config.packetCount = 4;
          config.maxPacketLoss = 0;
        }

        // 处理分组
        let groupId: string | null = null;
        const groupName = String(row['分组名称'] || row['groupName'] || '').trim();
        if (groupName) {
          if (groupMap.has(groupName)) {
            groupId = groupMap.get(groupName)!;
          } else {
            // 创建新分组
            const newGroup = await prisma.monitorGroup.create({
              data: {
                name: groupName,
                createdById: session.user.id
              }
            });
            groupId = newGroup.id;
            groupMap.set(groupName, groupId);
          }
        }

        // 构建监控数据
        const monitorData = {
          name,
          type,
          config,
          interval: parseInt(String(row['检查间隔(秒)'] || row['interval'] || '60')) || 60,
          retries: parseInt(String(row['重试次数'] || row['retries'] || '0')) || 0,
          retryInterval: parseInt(String(row['重试间隔(秒)'] || row['retryInterval'] || '60')) || 60,
          resendInterval: parseInt(String(row['重发间隔(秒)'] || row['resendInterval'] || '0')) || 0,
          upsideDown: String(row['反向监控'] || row['upsideDown'] || 'false').toLowerCase() === 'true',
          description: String(row['描述'] || row['description'] || '').trim() || '',
          active: String(row['是否启用'] || row['active'] || 'true').toLowerCase() !== 'false',
          groupId,
          notificationBindings: []
        };

        // 创建监控项
        const monitor = await monitorOperations.createMonitor(monitorData);

        // 记录创建成功的监控 ID，导入结束后统一调度
        createdMonitorIds.push(monitor.id);

        results.success++;
      } catch (error) {
        console.error(`导入第${rowNumber}行失败:`, error);
        results.errors.push({ 
          row: rowNumber, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
        results.failed++;
      }
    }

    // 导入全部处理完后，再异步统一触发调度，避免在循环中频繁调度导致导入过程变慢
    if (createdMonitorIds.length > 0) {
      setImmediate(async () => {
        try {
          const { scheduleMonitor } = await import('@/lib/monitors/scheduler');

          // 顺序调度新创建的监控项，避免一次性并发过高
          for (const id of createdMonitorIds) {
            try {
              await scheduleMonitor(id);
            } catch (error) {
              console.error(`调度导入的监控失败: ${id}`, error);
            }
          }
        } catch (error) {
          console.error('批量调度导入的监控失败:', error);
        }
      });
    }

    return NextResponse.json({
      message: `导入完成：成功 ${results.success} 条，失败 ${results.failed} 条`,
      results
    });
  } catch (error) {
    console.error('导入监控项失败:', error);
    return NextResponse.json(
      { error: '导入监控项失败，请稍后重试' },
      { status: 500 }
    );
  }
}
