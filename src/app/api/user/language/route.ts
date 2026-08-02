import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { buildAuthOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/i18n';

// GET /api/user/language — 返回当前用户的偏好语言
export async function GET() {
  try {
    const authOptions = await buildAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferredLanguage: true },
    });

    return NextResponse.json({
      success: true,
      language: user?.preferredLanguage || null,
    });
  } catch (error) {
    console.error('Failed to get language preference:', error);
    return NextResponse.json(
      { error: 'Failed to get language preference' },
      { status: 500 }
    );
  }
}

// POST /api/user/language — 更新当前用户的偏好语言
export async function POST(req: NextRequest) {
  try {
    const authOptions = await buildAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const language = body?.language;

    // 校验语言值
    const validLocales: Locale[] = ['zh', 'en'];
    const resolved = validLocales.includes(language) ? language : 'zh';

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLanguage: resolved },
    });

    return NextResponse.json({
      success: true,
      language: resolved,
    });
  } catch (error) {
    console.error('Failed to update language preference:', error);
    return NextResponse.json(
      { error: 'Failed to update language preference' },
      { status: 500 }
    );
  }
}
