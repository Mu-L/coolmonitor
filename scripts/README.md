# 密码重置工具

非交互式的命令行密码重置工具，专为 Docker 环境设计。

## 使用方法

```bash
# 自动生成随机密码
npm run reset-password admin

# 指定新密码
npm run reset-password admin "新密码123"

# 在 Docker 中使用
docker exec -it coolmonitor npm run reset-password admin
```

## 示例

```bash
$ npm run reset-password admin

✅ 密码重置成功!
用户: admin
新密码: aB3xY7kP9qM2

请使用新密码登录系统
```
