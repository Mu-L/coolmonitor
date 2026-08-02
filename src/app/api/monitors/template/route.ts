import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { validateAuth } from '@/lib/auth-helpers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TEMPLATE_FIELDS, getSampleData } from '@/lib/monitors/template-fields';
import type { Locale } from '@/lib/i18n';

// 获取当前用户偏好语言
async function getUserLocale(): Promise<Locale> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferredLanguage: true },
      });
      return user?.preferredLanguage === 'en' ? 'en' : 'zh';
    }
  } catch {
    // ignore
  }
  return 'zh';
}

// GET /api/monitors/template - 下载Excel模板
export async function GET() {
  try {
    const authError = await validateAuth();
    if (authError) return authError;

    const locale = await getUserLocale();

    // 创建模板数据（示例行）
    const templateData = getSampleData(locale);

    // 创建Excel工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 设置列宽
    worksheet['!cols'] = TEMPLATE_FIELDS.map(f => ({ wch: f.width || 15 }));

    // 工作表名称按语言切换
    const sheetName = locale === 'en' ? 'Monitor Template' : '监控项模板';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成Excel文件缓冲区
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 文件名按语言切换
    const filename = locale === 'en'
      ? encodeURIComponent('coolmonitor-template.xlsx')
      : encodeURIComponent('监控项导入模板.xlsx');

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
