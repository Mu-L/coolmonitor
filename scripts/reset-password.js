const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node scripts/reset-password.js <用户名> [新密码]');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/reset-password.js admin');
    console.log('  node scripts/reset-password.js admin "新密码123"');
    console.log('');
    console.log('如果不提供新密码,将自动生成一个随机密码');
    console.log('在 Docker 中使用:');
    console.log('  docker exec -it coolmonitor node scripts/reset-password.js admin');
    console.log('  docker exec -it coolmonitor node scripts/reset-password.js admin "新密码123"');
    process.exit(0);
  }

  const username = args[0];
  const newPassword = args[1];

  if (!username || username.trim() === '') {
    console.error('❌ 错误: 用户名不能为空');
    process.exit(1);
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    console.error(`❌ 错误: 用户 "${username}" 不存在`);
    
    // 列出所有用户供参考
    const allUsers = await prisma.user.findMany({
      select: {
        username: true,
        isAdmin: true
      }
    });
    
    if (allUsers.length > 0) {
      console.log('');
      console.log('当前系统中的用户:');
      allUsers.forEach(u => {
        const role = u.isAdmin ? '[管理员]' : '[普通用户]';
        console.log(`  - ${u.username} ${role}`);
      });
    }
    
    process.exit(1);
  }

  // 生成或使用提供的密码
  let passwordToSet;
  if (newPassword) {
    passwordToSet = newPassword;
  } else {
    // 生成12位随机密码
    passwordToSet = generateRandomPassword(12);
  }

  // 检查密码长度
  if (passwordToSet.length < 6) {
    console.error('❌ 错误: 密码长度至少6位');
    process.exit(1);
  }

  // 重置密码
  const hashedPassword = await bcrypt.hash(passwordToSet, 10);
  
  await prisma.user.update({
    where: { username },
    data: { password: hashedPassword }
  });

  console.log('✅ 密码重置成功!');
  console.log(`用户: ${username}`);
  console.log(`新密码: ${passwordToSet}`);
  console.log('');
  console.log('请使用新密码登录系统');
  console.log('');
  console.log('🔒 安全提示:');
  console.log('  - 请妥善保管新密码');
  console.log('  - 首次登录后建议修改为更复杂的密码');
}

/**
 * 生成随机密码
 * @param {number} length 密码长度
 * @returns {string} 随机密码
 */
function generateRandomPassword(length) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

main()
  .catch((error) => {
    console.error('❌ 密码重置失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
