import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { validateAuth } from '@/lib/auth-helpers';

// GET /api/monitors/template - 下载Excel模板
export async function GET() {
  try {
    // 验证用户是否已登录
    const authError = await validateAuth();
    if (authError) return authError;

    // 创建模板数据
    const templateData = [
      {
        '监控名称': '示例网站监控',
        '监控类型': 'http',
        'URL': 'https://example.com',
        '主机名': '',
        '端口': '',
        '关键字': '',
        '检查间隔(秒)': 60,
        '重试次数': 0,
        '重试间隔(秒)': 60,
        '重发间隔(秒)': 0,
        '是否启用': true,
        '反向监控': false,
        '描述': '示例监控项',
        '分组名称': '',
        'HTTP方法': 'GET',
        '状态码范围': '200-299',
        '最大重定向次数': 10,
        '连接超时(秒)': 10,
        '忽略TLS错误': false,
        '通知证书到期': false,
        '用户名': '',
        '密码': '',
        '数据库名': '',
        '查询语句': ''
      },
      {
        '监控名称': '示例端口监控',
        '监控类型': 'port',
        'URL': '',
        '主机名': 'example.com',
        '端口': 80,
        '关键字': '',
        '检查间隔(秒)': 60,
        '重试次数': 0,
        '重试间隔(秒)': 60,
        '重发间隔(秒)': 0,
        '是否启用': true,
        '反向监控': false,
        '描述': '',
        '分组名称': '',
        'HTTP方法': '',
        '状态码范围': '',
        '最大重定向次数': '',
        '连接超时(秒)': '',
        '忽略TLS错误': '',
        '通知证书到期': '',
        '用户名': '',
        '密码': '',
        '数据库名': '',
        '查询语句': ''
      }
    ];

    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 设置列宽
    const columnWidths = [
      { wch: 20 }, // 监控名称
      { wch: 12 }, // 监控类型
      { wch: 30 }, // URL
      { wch: 20 }, // 主机名
      { wch: 8 },  // 端口
      { wch: 15 }, // 关键字
      { wch: 15 }, // 检查间隔
      { wch: 10 }, // 重试次数
      { wch: 15 }, // 重试间隔
      { wch: 15 }, // 重发间隔
      { wch: 10 }, // 是否启用
      { wch: 10 }, // 反向监控
      { wch: 20 }, // 描述
      { wch: 15 }, // 分组名称
      { wch: 12 }, // HTTP方法
      { wch: 15 }, // 状态码范围
      { wch: 15 }, // 最大重定向次数
      { wch: 15 }, // 连接超时
      { wch: 12 }, // 忽略TLS错误
      { wch: 15 }, // 通知证书到期
      { wch: 15 }, // 用户名
      { wch: 15 }, // 密码
      { wch: 15 }, // 数据库名
      { wch: 20 }  // 查询语句
    ];
    worksheet['!cols'] = columnWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '监控项模板');

    // 生成Excel文件缓冲区
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件
    const filename = encodeURIComponent('监控项导入模板.xlsx');
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`
      }
    });
  } catch (error) {
    console.error('生成模板失败:', error);
    return NextResponse.json(
      { error: '生成模板失败，请稍后重试' },
      { status: 500 }
    );
  }
}
