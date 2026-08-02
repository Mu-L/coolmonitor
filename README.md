# CoolMonitor | A Beautiful Monitoring Tool

English | [中文](./README_ZH.md)

CoolMonitor is a beautiful monitoring tool that supports website monitoring, API monitoring, HTTPS certificate monitoring, and more — helping developers and ops teams stay on top of their services in real time. It supports one-click Docker deployment and features a modern, elegant UI.

## Features

* **Multiple Monitor Types**: HTTP/HTTPS websites, API endpoints, HTTPS certificate expiry, TCP ports, MySQL/Redis databases, and more
* **Push Monitoring**: Passively receive heartbeat pushes from clients to monitor devices that aren't directly accessible
* **Custom Script Actions**: Automatically execute Node.js scripts on status changes (e.g., switch DNS). Sandboxed execution with network-only module access for security
* **Beautiful UI**: Dark/light theme switching, responsive design for all device sizes
* **Powerful Notifications**: Email, Webhook, WeChat, DingTalk, WeCom, and more
* **Data Visualization**: Intuitive status charts and analytics
* **Persistent Storage**: SQLite database — lightweight deployment with no external dependencies
* **Internationalization**: Built-in Chinese and English language support with automatic browser language detection

## Screenshots

### Dashboard
![Dashboard](./screenshot/dashboard-main.png)

### Monitor Detail
![Monitor Detail](./screenshot/dashboard-one.png)

### Add Monitor
![Add Monitor](./screenshot/add.png)

### Notification Settings
![Notifications](./screenshot/notification.png)

## Monitor Types

* **HTTP/HTTPS Website**: Check website availability and response time
* **HTTPS Certificate**: Check SSL certificate expiry and warn early
* **Keyword**: Check if a page contains specific keywords
* **TCP Port**: Check if a port is open
* **MySQL/MariaDB Database**: Check database connection and basic queries
* **Redis Database**: Check Redis service status
* **ICMP Ping**: Check host reachability
* **Push**: Passively receive client heartbeat pushes

## Tech Stack

* **Frontend**: Next.js (React 19)
* **Backend**: Next.js API Routes
* **Database**: SQLite (via Prisma ORM)
* **UI**: TailwindCSS
* **Charts**: ECharts
* **Auth**: NextAuth.js
* **Scheduling**: Croner

## Installation & Deployment

### Docker (Recommended)

```bash
# For x86/x64 architecture
docker run -d --name coolmonitor --restart always -p 3333:3333 -v ~/coolmonitor_data:/app/data star7th/coolmonitor:latest

# For ARM architecture (e.g., Raspberry Pi, Apple Silicon)
docker run -d --name coolmonitor --restart always -p 3333:3333 -v ~/coolmonitor_data:/app/data star7th/coolmonitor:arm-latest
```

### First-Time Setup

On first launch, the system will automatically:
1. Check if the database exists
   - Use the bundled database if available
   - Otherwise, initialize the database structure automatically
2. Guide you through creating an admin account on first visit

Visit http://localhost:3333 to start using CoolMonitor.

## Updating

### Docker Update

```bash
# 1. Stop the running container
docker stop coolmonitor

# 2. Remove the old container (data is preserved in the mounted volume)
docker rm coolmonitor

# 3. Pull the latest image
docker pull star7th/coolmonitor:latest
# Or for ARM architecture
docker pull star7th/coolmonitor:arm-latest

# 4. Run the container again
docker run -d --name coolmonitor --restart always -p 3333:3333 -v ~/coolmonitor_data:/app/data star7th/coolmonitor:latest
```

**Notes:**
- Your monitoring data and configuration are preserved in the mounted data volume
- Back up important data before updating
- The first start after an update may take a few seconds for database migration

## Project Structure

```
coolmonitor/
├── src/
│   ├── app/                - Next.js application
│   │   ├── dashboard/      - Monitoring dashboard
│   │   ├── auth/           - Authentication
│   │   └── api/            - API endpoints
│   ├── components/         - Reusable components
│   ├── lib/                - Utilities and libraries
│   │   ├── monitors/       - Monitor checker implementations
│   │   ├── i18n/           - Internationalization (zh/en)
│   │   ├── database-upgrader.ts - Database upgrade tool
│   │   └── system-init.ts  - System initialization
│   ├── hooks/              - Custom hooks
│   ├── context/            - React contexts (Auth, I18n)
│   └── types/              - TypeScript type definitions
└── prisma/                 - Database models and migrations
```

## Documentation

Complete developer and AI documentation is available in [`docs/`](./docs/README.md) (in Chinese):

- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Monitoring System](./docs/monitoring-system.md)
- [API Reference](./docs/api-reference.md)
- [Data Models](./docs/data-models.md)
- [Configuration](./docs/configuration.md)
- [Deployment](./docs/deployment.md)

## Internationalization

CoolMonitor supports Chinese and English. The interface language is:
1. Automatically detected from your browser settings (defaults to Chinese if undetectable)
2. Switchable via the language button in the top navigation bar
3. Persisted per user for notification language preferences

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 — see the LICENSE file for details.

## Links

* GitHub Repository: https://github.com/star7th/coolmonitor
