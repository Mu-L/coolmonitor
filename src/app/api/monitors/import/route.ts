import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { monitorOperations } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { buildHeaderResolver } from '@/lib/monitors/template-fields';

// POST /api/monitors/import - 导入Excel文件
// 支持中英文表头，通过 buildHeaderResolver 自动识别
export async function POST(request: NextRequest) {
  try {
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

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: '仅支持Excel文件(.xlsx, .xls)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'Excel文件中没有数据' },
        { status: 400 }
      );
    }

    // 构建表头解析器：把任意语言的列名映射为统一内部 key
    const headerMap = buildHeaderResolver();

    // 从行数据中安全取值，自动识别中英文表头
    const getField = (row: Record<string, any>, fieldKey: string): string => {
      // 先直接按内部 key 取
      if (row[fieldKey] !== undefined && row[fieldKey] !== '') {
        return String(row[fieldKey]).trim();
      }
      // 再遍历所有列，用 headerMap 匹配
      for (const [excelHeader, internalKey] of Object.entries(headerMap)) {
        if (internalKey === fieldKey && row[excelHeader] !== undefined && row[excelHeader] !== '') {
          return String(row[excelHeader]).trim();
        }
      }
      return '';
    };

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    const createdMonitorIds: string[] = [];

    const groups = await prisma.monitorGroup.findMany({
      where: { createdById: session.user.id }
    });
    const groupMap = new Map(groups.map(g => [g.name, g.id]));

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as Record<string, any>;
      const rowNumber = i + 2;

      try {
        const name = getField(row, 'name');
        const type = getField(row, 'type').toLowerCase();

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

        const validTypes = ['http', 'keyword', 'https-cert', 'port', 'mysql', 'redis', 'icmp', 'push'];
        if (!validTypes.includes(type)) {
          results.errors.push({ row: rowNumber, error: `无效的监控类型: ${type}，支持的类型: ${validTypes.join(', ')}` });
          results.failed++;
          continue;
        }

        const config: Record<string, any> = {};

        if (['http', 'keyword', 'https-cert'].includes(type)) {
          const url = getField(row, 'url');
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
            config.httpMethod = getField(row, 'httpMethod') || 'GET';
            config.statusCodes = getField(row, 'statusCodes') || '200-299';
          }

          config.maxRedirects = parseInt(getField(row, 'maxRedirects') || '10') || 10;
          config.connectTimeout = parseInt(getField(row, 'connectTimeout') || '10') || 10;
          config.ignoreTls = (getField(row, 'ignoreTls') || 'false').toLowerCase() === 'true';

          if (type === 'http') {
            config.notifyCertExpiry = (getField(row, 'notifyCertExpiry') || 'false').toLowerCase() === 'true';
          }

          if (type === 'keyword') {
            const keyword = getField(row, 'keyword');
            if (!keyword) {
              results.errors.push({ row: rowNumber, error: '关键字监控需要关键字字段' });
              results.failed++;
              continue;
            }
            config.keyword = keyword;
          }

          const requestBody = getField(row, 'requestBody');
          const requestHeaders = getField(row, 'requestHeaders');
          if (requestBody) config.requestBody = requestBody;
          if (requestHeaders) config.requestHeaders = requestHeaders;
        }

        if (['port', 'mysql', 'redis'].includes(type)) {
          const hostname = getField(row, 'hostname');
          const port = getField(row, 'port');

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
            config.username = getField(row, 'username');
            config.password = getField(row, 'password');
            config.query = getField(row, 'query');

            if (type === 'mysql') {
              config.database = getField(row, 'database');
            }
          }
        }

        if (type === 'icmp') {
          const hostname = getField(row, 'hostname');
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
        const groupName = getField(row, 'groupName');
        if (groupName) {
          if (groupMap.has(groupName)) {
            groupId = groupMap.get(groupName)!;
          } else {
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

        const monitorData = {
          name,
          type,
          config,
          interval: parseInt(getField(row, 'interval') || '60') || 60,
          retries: parseInt(getField(row, 'retries') || '0') || 0,
          retryInterval: parseInt(getField(row, 'retryInterval') || '60') || 60,
          resendInterval: parseInt(getField(row, 'resendInterval') || '0') || 0,
          upsideDown: (getField(row, 'upsideDown') || 'false').toLowerCase() === 'true',
          description: getField(row, 'description'),
          active: (getField(row, 'active') || 'true').toLowerCase() !== 'false',
          groupId,
          notificationBindings: []
        };

        const monitor = await monitorOperations.createMonitor(monitorData);
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

    if (createdMonitorIds.length > 0) {
      setImmediate(async () => {
        try {
          const { scheduleMonitor } = await import('@/lib/monitors/scheduler');
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
