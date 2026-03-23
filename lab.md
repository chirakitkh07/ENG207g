# 🏗️ คู่มือปฏิบัติการ ENGSE207 - Term Project Week 6
## N-Tier Architecture: Redis Caching + Nginx Load Balancing

**สัปดาห์:** 6 | **ระยะเวลา:** 3 ชั่วโมง | **ระดับความยาก:** ⭐⭐⭐⭐

> **ต่อยอดจาก:** Week 6 เดิม (N-Tier Docker) → เพิ่ม Redis + Load Balancing + Multiple Instances

---

## 📋 สารบัญ

1. [วัตถุประสงค์การเรียนรู้](#-วัตถุประสงค์การเรียนรู้)
2. [ทฤษฎี: N-Tier + Caching + Load Balancing](#-ทฤษฎี-ภาพรวมสถาปัตยกรรม)
3. [ภาพรวมสถาปัตยกรรม](#-architecture-diagram)
4. [Part 1: สร้างโครงสร้างโปรเจกต์ (15 นาที)](#part-1-สร้างโครงสร้างโปรเจกต์-15-นาที)
5. [Part 2: Backend API + Redis Integration (60 นาที)](#part-2-backend-api--redis-integration-60-นาที)
6. [Part 3: Nginx Load Balancer (30 นาที)](#part-3-nginx-load-balancer-30-นาที)
7. [Part 4: Docker Compose + Scale (30 นาที)](#part-4-docker-compose--scale-30-นาที)
8. [Part 5: Testing & Monitoring (30 นาที)](#part-5-testing--monitoring-30-นาที)
9. [Part 6: ทดลอง Availability และ Scalability (45 นาที)](#part-6-ทดลอง-availability-และ-scalability-45-นาที)
10. [Part 7: สรุปและเปรียบเทียบ](#part-7-สรุปและเปรียบเทียบ)
11. [Challenge: ทำต่อเอง](#-challenge-ทำต่อเอง)
12. [การส่งงาน](#-การส่งงานทาง-git)

---

## 🎯 วัตถุประสงค์การเรียนรู้

เมื่อจบ Lab นี้ นักศึกษาจะสามารถ:

| ✅ | วัตถุประสงค์ | CLO |
|---|------------|-----|
| ☐ | อธิบายความแตกต่างระหว่าง Tier (Physical) กับ Layer (Logical) ได้ | CLO2 |
| ☐ | ติดตั้งและใช้งาน Redis เป็น Caching Layer ใน Docker ได้ | CLO4, CLO6 |
| ☐ | ตั้งค่า Nginx เป็น Load Balancer แบบ Round-Robin สำหรับ Multiple App Instances ได้ | CLO4, CLO6 |
| ☐ | ใช้ `docker compose up --scale` เพื่อ Scale Application ในแนวนอนได้ | CLO4, CLO14 |
| ☐ | ทดสอบ Cache Hit/Miss และวัดผลกระทบของ Caching ต่อ Performance ได้ | CLO3, CLO13 |
| ☐ | เปรียบเทียบ Single Instance กับ Multi-Instance Deployment ได้ | CLO2, CLO7 |

---

## 📚 ทฤษฎี: ภาพรวมสถาปัตยกรรม

### Tier vs Layer — สิ่งที่ต่างกันจริงๆ

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Layer (Logical) vs Tier (Physical)                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer = การจัดกลุ่ม Code                  Tier = การจัดวาง Runtime/Server   │
│  (Logical separation)                    (Physical separation)           │
│                                                                          │
│  ┌──────────────────┐                   ┌──────────────────┐             │
│  │ Presentation     │ ── Code ──►       │  Nginx Container │ ← Tier 1    │
│  │ Business Logic   │                   │  (Port 80)       │             │
│  │ Data Access      │                   └──────────────────┘             │
│  └──────────────────┘                   ┌──────────────────┐             │
│  ทั้งหมดอยู่ใน 1 Process                    │  App Container   │ ← Tier 2    │
│  (Week 4: Layered)                      │  ×3 instances    │             │
│                                         └──────────────────┘             │
│                                         ┌─────────┬────────┐             │
│                                         │  Redis  │Postgres│ ← Tier 3    │
│                                         │ (Cache) │  (DB)  │             │
│                                         └─────────┴────────┘             │
│                                   แต่ละ Tier = Docker Container ต่างกัน     │
│                                                                          │
│  📌 สัปดาห์นี้เราทำ 4 Tiers:                                                 │
│     Tier 1: Nginx (Load Balancer + Static Files)                         │
│     Tier 2: App Servers ×3 (Node.js API)                                 │
│     Tier 3a: Redis (Cache)                                               │
│     Tier 3b: PostgreSQL (Database)                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### ทำไมต้องมี Caching Layer (Redis)?

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    ❌ ไม่มี Cache                vs        ✅ มี Redis Cache  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Browser ──► API ──► PostgreSQL             Browser ──► API ──► Redis ✓    │
│  Browser ──► API ──► PostgreSQL             Browser ──► API ──► Redis ✓    │
│  Browser ──► API ──► PostgreSQL             Browser ──► API ──► Redis ✓    │
│  Browser ──► API ──► PostgreSQL  (ทุกครั้ง!)   Browser ──► API ──► Redis ✓    │
│                                              (hit cache! ไม่ต้องไป DB)       │
│  ⏱️ ~50ms ต่อ request                                                       │
│  📊 DB Load: HIGH                        ⏱️ ~2-5ms ต่อ request (cache hit)  │
│                                              📊 DB Load: LOW               │
│                                                                            │
│  เปรียบเทียบ:                                                                │
│  DB Query = เปิดตู้เย็นทุกครั้งที่หิว 🚶‍♂️ → 🏠 → 🍎                                   │
│  Redis    = วางแอปเปิ้ลไว้บนโต๊ะ 🚶‍♂️ → 🍎 (เร็วกว่า!)                             │
│                                                                            │
│  Redis = In-Memory Database (เก็บใน RAM)                                    │
│  • อ่าน/เขียนเร็วมาก (~0.1ms)                                                 │
│  • เหมาะสำหรับข้อมูลที่อ่านบ่อย เปลี่ยนไม่บ่อย                                        │
│  • TTL (Time-To-Live) = ข้อมูลหมดอายุอัตโนมัติ                                   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### ทำไมต้อง Load Balancing?

```
┌───────────────────────────────────────────────────────────────────────────┐
│               Load Balancing — กระจาย Request ไปหลาย Server               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ❌ Single Instance:                ✅ Load Balanced (3 Instances):       │
│                                                                           │
│  User1 ─┐                           User1 ─┐                              │
│  User2 ─┤──► App ×1 (Port 3000)     User2 ─┤──► Nginx LB ──┬► App#1       │
│  User3 ─┤      💀 ถ้าล่ม=จบ!          User3 ─┤    (Round-    ├► App#2       │
│  User4 ─┘      📈 ช้าเมื่อ Load สูง     User4 ─┘     Robin)    └► App#3       │
│                                                                           │
│  Round-Robin = สลับส่งทีละตัว:                                                │
│  Request 1 → App#1                                                        │
│  Request 2 → App#2                                                        │
│  Request 3 → App#3                                                        │
│  Request 4 → App#1 (วนรอบ)                                                │
│                                                                           │
│  ข้อดี:                                                                     │
│  • High Availability: ถ้า App#1 ล่ม → App#2, #3 ยังทำงาน                     │
│  • Horizontal Scaling: เพิ่ม Instance ได้ง่าย (scale=5)                       │
│  • Better Performance: กระจาย Load → ตอบเร็วขึ้น                             │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Term Project Week 6: N-Tier Architecture with Redis + Load Balancing     │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                              Browser (Client)                             │
│                                   │                                       │
│                              Port 80 (HTTP)                               │
│                                   ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  TIER 1: Nginx (Load Balancer + Static Files)                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │  • Serve frontend static files (HTML/CSS/JS)                  │  │  │
│  │  │  • Load Balance /api/* across App Instances (Round-Robin)     │  │  │
│  │  │  • Health Check: auto-remove unhealthy instances              │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  └──────────┬──────────────────────┬───────────────────┬───────────────┘  │
│             │                      │                   │                  │
│             ▼                      ▼                   ▼                  │
│    ┌────────────────┐   ┌────────────────┐   ┌────────────────┐           │
│    │  TIER 2: App#1 │   │  TIER 2: App#2 │   │  TIER 2: App#3 │           │
│    │  Node.js :3000 │   │  Node.js :3000 │   │  Node.js :3000 │           │
│    │  ┌──────────┐  │   │  ┌──────────┐  │   │  ┌──────────┐  │           │
│    │  │Controller│  │   │  │Controller│  │   │  │Controller│  │           │
│    │  │Service   │  │   │  │Service   │  │   │  │Service   │  │           │
│    │  │Repository│  │   │  │Repository│  │   │  │Repository│  │           │
│    │  └──────────┘  │   │  └──────────┘  │   │  └──────────┘  │           │
│    └───────┬────────┘   └───────┬────────┘   └───────┬────────┘           │
│            │                    │                    │                    │
│            └────────────────────┼────────────────────┘                    │
│                                 │                                         │
│                ┌────────────────┼────────────────┐                        │
│                ▼                                 ▼                        │
│     ┌─────────────────────┐          ┌──────────────────────┐             │
│     │  TIER 3a: Redis     │          │  TIER 3b: PostgreSQL │             │
│     │  (Cache Layer)      │          │  (Persistent Data)   │             │
│     │                     │          │                      │             │
│     │  • In-Memory Store  │          │  • tasks table       │             │
│     │  • TTL: 60 seconds  │          │  • Persistent volume │             │
│     │  • Cache all tasks  │          │                      │             │
│     └─────────────────────┘          └──────────────────────┘             │
│                                                                           │
│     Docker Network: taskboard-ntier                                       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: สร้างโครงสร้างโปรเจกต์ (15 นาที)

### 1.1 สร้างโฟลเดอร์โปรเจกต์

```bash
# สร้างโฟลเดอร์หลัก (ใน term-project repo)
mkdir -p ~/term-project/week6-ntier-redis
cd ~/term-project/week6-ntier-redis

# สร้างโครงสร้าง
mkdir -p api/src/{config,controllers,services,repositories,models,middleware,routes}
mkdir -p nginx/conf.d
mkdir -p frontend/{css,js}
mkdir -p database
mkdir -p scripts
mkdir -p docs

echo "✅ โครงสร้างพร้อม!"
tree -L 3 2>/dev/null || find . -type d | head -30
```

### 1.2 สร้างไฟล์ .gitignore

```bash
cat > .gitignore << 'EOF'
node_modules/
.env
*.log
.DS_Store
.vscode/
EOF
```

### 1.3 สร้างไฟล์ .env

```bash
cat > .env << 'EOF'
# === Database ===
POSTGRES_DB=taskboard_db
POSTGRES_USER=taskboard
POSTGRES_PASSWORD=taskboard123
DB_HOST=db
DB_PORT=5432
DB_NAME=taskboard_db
DB_USER=taskboard
DB_PASSWORD=taskboard123

# === Redis ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TTL=60

# === App ===
PORT=3000
NODE_ENV=development
EOF
```

### ✅ Checkpoint 1: โครงสร้างพร้อม

---

## Part 2: Backend API + Redis Integration (60 นาที)

### 2.1 สร้าง package.json

```bash
cat > api/package.json << 'EOF'
{
  "name": "taskboard-ntier-redis",
  "version": "1.0.0",
  "description": "ENGSE207 Term Project Week 6 - N-Tier + Redis + Load Balancing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "morgan": "^1.10.0",
    "pg": "^8.11.3",
    "redis": "^4.6.12"
  }
}
EOF
```

### 2.2 สร้าง Dockerfile

```bash
cat > api/Dockerfile << 'EOF'
FROM node:20-alpine
LABEL description="TaskBoard API - N-Tier with Redis"
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
EOF
```

### 2.3 Database Config

```bash
cat > api/src/config/database.js << 'EOF'
// src/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'taskboard_db',
    user: process.env.DB_USER || 'taskboard',
    password: process.env.DB_PASSWORD || 'taskboard123',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err) => console.error('❌ PostgreSQL error:', err.message));

const query = async (text, params) => {
    const start = Date.now();
    const result = await pool.query(text, params);
    console.log(`📊 DB Query: ${Date.now() - start}ms | Rows: ${result.rowCount}`);
    return result;
};

const healthCheck = async () => {
    try {
        const result = await pool.query('SELECT NOW() as time');
        return { status: 'healthy', timestamp: result.rows[0].time };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
};

module.exports = { pool, query, healthCheck };
EOF
```

### 2.4 Redis Config — ⭐ ใหม่!

```bash
cat > api/src/config/redis.js << 'EOF'
// src/config/redis.js
// Redis Cache Configuration — NEW in Week 6!
//
// Redis = In-Memory Key-Value Store
// ใช้เป็น Cache Layer เพื่อลด Database Load
//
// Pattern: Cache-Aside (Lazy Loading)
// 1. App ดู Cache ก่อน → ถ้ามี (HIT) → return ทันที
// 2. ถ้าไม่มี (MISS) → Query DB → เก็บใน Cache → return
// 3. เมื่อ Data เปลี่ยน → ลบ Cache (Invalidate)

const { createClient } = require('redis');

let client = null;
let isConnected = false;

// สถิติ Cache (เก็บในหน่วยความจำ)
const stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    get hitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? Math.round((this.hits / total) * 100) : 0;
    }
};

// เชื่อมต่อ Redis
const connectRedis = async () => {
    try {
        client = createClient({
            url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
        });

        client.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
            isConnected = false;
        });

        client.on('connect', () => {
            console.log('✅ Connected to Redis');
            isConnected = true;
        });

        await client.connect();
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.log('⚠️  App will work without cache (degraded mode)');
        isConnected = false;
    }
};

// ดึงข้อมูลจาก Cache
const getCache = async (key) => {
    if (!isConnected || !client) {
        stats.misses++;
        return null;
    }
    try {
        const data = await client.get(key);
        if (data) {
            stats.hits++;
            console.log(`🟢 CACHE HIT: ${key}`);
            return JSON.parse(data);
        }
        stats.misses++;
        console.log(`🔴 CACHE MISS: ${key}`);
        return null;
    } catch (error) {
        stats.errors++;
        console.error('❌ Cache get error:', error.message);
        return null;
    }
};

// เก็บข้อมูลลง Cache
const setCache = async (key, data, ttlSeconds) => {
    if (!isConnected || !client) return;
    try {
        const ttl = ttlSeconds || parseInt(process.env.REDIS_TTL) || 60;
        await client.setEx(key, ttl, JSON.stringify(data));
        console.log(`💾 CACHE SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
        stats.errors++;
        console.error('❌ Cache set error:', error.message);
    }
};

// ลบ Cache (เมื่อข้อมูลเปลี่ยน)
const invalidateCache = async (pattern) => {
    if (!isConnected || !client) return;
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`🗑️ CACHE INVALIDATED: ${keys.length} keys matching "${pattern}"`);
        }
    } catch (error) {
        console.error('❌ Cache invalidate error:', error.message);
    }
};

// ตรวจสอบสถานะ Redis
const redisHealthCheck = async () => {
    if (!isConnected || !client) {
        return { status: 'disconnected', stats };
    }
    try {
        await client.ping();
        return { status: 'healthy', stats };
    } catch {
        return { status: 'unhealthy', stats };
    }
};

module.exports = { connectRedis, getCache, setCache, invalidateCache, redisHealthCheck, stats };
EOF
```

> **💡 อธิบาย Cache-Aside Pattern:**
> ```
> Request เข้ามา → ดู Redis (Cache) ก่อน
>       │
>       ├── HIT (มีข้อมูล) ──────► return ทันที (⚡ เร็วมาก ~2ms)
>       │
>       └── MISS (ไม่มีข้อมูล) ──► Query PostgreSQL (~50ms)
>                                     │
>                                     ├── เก็บลง Redis (TTL=60s)
>                                     └── return ข้อมูล
> ```

### 2.5 Task Model

```bash
cat > api/src/models/Task.js << 'EOF'
// src/models/Task.js
class Task {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description || '';
        this.status = data.status || 'TODO';
        this.priority = data.priority || 'MEDIUM';
        this.createdAt = data.created_at || data.createdAt;
        this.updatedAt = data.updated_at || data.updatedAt;
    }

    static STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
    static PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

    static validate(data) {
        const errors = [];
        if (!data.title || data.title.trim().length === 0) errors.push('Title is required');
        if (data.title && data.title.length > 200) errors.push('Title must be less than 200 characters');
        if (data.status && !Task.STATUSES.includes(data.status)) errors.push(`Status must be one of: ${Task.STATUSES.join(', ')}`);
        if (data.priority && !Task.PRIORITIES.includes(data.priority)) errors.push(`Priority must be one of: ${Task.PRIORITIES.join(', ')}`);
        return { isValid: errors.length === 0, errors };
    }

    toJSON() {
        return { id: this.id, title: this.title, description: this.description, status: this.status, priority: this.priority, createdAt: this.createdAt, updatedAt: this.updatedAt };
    }
}

module.exports = Task;
EOF
```

### 2.6 Repository Layer (Database Access)

```bash
cat > api/src/repositories/taskRepository.js << 'EOF'
// src/repositories/taskRepository.js
const { query } = require('../config/database');
const Task = require('../models/Task');

class TaskRepository {
    async findAll() {
        const sql = `SELECT id, title, description, status, priority, created_at, updated_at FROM tasks ORDER BY CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 END, created_at DESC`;
        const result = await query(sql);
        return result.rows.map(row => new Task(row));
    }

    async findById(id) {
        const sql = 'SELECT id, title, description, status, priority, created_at, updated_at FROM tasks WHERE id = $1';
        const result = await query(sql, [id]);
        if (result.rows.length === 0) return null;
        return new Task(result.rows[0]);
    }

    async create(taskData) {
        const sql = `INSERT INTO tasks (title, description, status, priority) VALUES ($1, $2, $3, $4) RETURNING id, title, description, status, priority, created_at, updated_at`;
        const result = await query(sql, [taskData.title, taskData.description || '', taskData.status || 'TODO', taskData.priority || 'MEDIUM']);
        return new Task(result.rows[0]);
    }

    async update(id, taskData) {
        const sql = `UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status), priority = COALESCE($4, priority), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, title, description, status, priority, created_at, updated_at`;
        const result = await query(sql, [taskData.title, taskData.description, taskData.status, taskData.priority, id]);
        if (result.rows.length === 0) return null;
        return new Task(result.rows[0]);
    }

    async delete(id) {
        const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
        return result.rowCount > 0;
    }

    async countByStatus() {
        const sql = 'SELECT status, COUNT(*) as count FROM tasks GROUP BY status';
        const result = await query(sql);
        return result.rows.reduce((acc, row) => { acc[row.status] = parseInt(row.count); return acc; }, { TODO: 0, IN_PROGRESS: 0, DONE: 0 });
    }
}

module.exports = new TaskRepository();
EOF
```

### 2.7 Service Layer — ⭐ เพิ่ม Redis Caching!

```bash
cat > api/src/services/taskService.js << 'EOF'
// src/services/taskService.js
// Business Logic Layer + Redis Caching Integration
//
// 📌 Cache Strategy: Cache-Aside
//   GET  → ดู Cache ก่อน → ถ้า MISS → Query DB → เก็บ Cache
//   POST/PUT/DELETE → ทำงานกับ DB → Invalidate Cache

const taskRepository = require('../repositories/taskRepository');
const Task = require('../models/Task');
const { getCache, setCache, invalidateCache } = require('../config/redis');

// Cache key constants
const CACHE_KEYS = {
    ALL_TASKS: 'tasks:all',
    TASK_BY_ID: (id) => `tasks:${id}`,
    STATS: 'tasks:stats'
};

class TaskService {

    // GET all tasks — ใช้ Cache
    async getAllTasks() {
        // 1. ดู Cache ก่อน
        const cached = await getCache(CACHE_KEYS.ALL_TASKS);
        if (cached) return cached;   // 🟢 CACHE HIT

        // 2. ถ้า MISS → Query DB
        const tasks = await taskRepository.findAll();
        const json = tasks.map(t => t.toJSON());

        // 3. เก็บลง Cache (TTL 60 วินาที)
        await setCache(CACHE_KEYS.ALL_TASKS, json, 60);

        return json;  // 🔴 CACHE MISS → got from DB
    }

    // GET task by ID — ใช้ Cache
    async getTaskById(id) {
        const cached = await getCache(CACHE_KEYS.TASK_BY_ID(id));
        if (cached) return cached;

        const task = await taskRepository.findById(id);
        if (!task) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        await setCache(CACHE_KEYS.TASK_BY_ID(id), task.toJSON(), 60);
        return task.toJSON();
    }

    // POST create task — Invalidate Cache
    async createTask(taskData) {
        const validation = Task.validate(taskData);
        if (!validation.isValid) {
            const error = new Error(validation.errors.join(', '));
            error.statusCode = 400;
            throw error;
        }

        const task = await taskRepository.create(taskData);

        // ❗ Invalidate related caches
        await invalidateCache('tasks:*');

        return task.toJSON();
    }

    // PUT update task — Invalidate Cache
    async updateTask(id, taskData) {
        const existingTask = await taskRepository.findById(id);
        if (!existingTask) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        if (existingTask.status === 'DONE' && taskData.status && taskData.status !== 'DONE') {
            const error = new Error('Cannot change status of completed task');
            error.statusCode = 400;
            throw error;
        }

        const task = await taskRepository.update(id, taskData);

        // ❗ Invalidate related caches
        await invalidateCache('tasks:*');

        return task.toJSON();
    }

    // DELETE task — Invalidate Cache
    async deleteTask(id) {
        const existingTask = await taskRepository.findById(id);
        if (!existingTask) {
            const error = new Error('Task not found');
            error.statusCode = 404;
            throw error;
        }

        if (existingTask.status === 'IN_PROGRESS') {
            const error = new Error('Cannot delete task that is in progress');
            error.statusCode = 400;
            throw error;
        }

        const result = await taskRepository.delete(id);

        // ❗ Invalidate related caches
        await invalidateCache('tasks:*');

        return result;
    }

    // GET statistics — ใช้ Cache
    async getStatistics() {
        const cached = await getCache(CACHE_KEYS.STATS);
        if (cached) return cached;

        const counts = await taskRepository.countByStatus();
        const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
        const stats = {
            total,
            byStatus: counts,
            completionRate: total > 0 ? Math.round((counts.DONE / total) * 100) : 0
        };

        await setCache(CACHE_KEYS.STATS, stats, 30);
        return stats;
    }
}

module.exports = new TaskService();
EOF
```

### 2.8 Controller Layer

```bash
cat > api/src/controllers/taskController.js << 'EOF'
// src/controllers/taskController.js
const taskService = require('../services/taskService');

class TaskController {
    async getAllTasks(req, res, next) {
        try {
            const tasks = await taskService.getAllTasks();
            res.json({ success: true, data: tasks, count: tasks.length });
        } catch (error) { next(error); }
    }

    async getTaskById(req, res, next) {
        try {
            const task = await taskService.getTaskById(parseInt(req.params.id));
            res.json({ success: true, data: task });
        } catch (error) { next(error); }
    }

    async createTask(req, res, next) {
        try {
            const task = await taskService.createTask(req.body);
            res.status(201).json({ success: true, data: task });
        } catch (error) { next(error); }
    }

    async updateTask(req, res, next) {
        try {
            const task = await taskService.updateTask(parseInt(req.params.id), req.body);
            res.json({ success: true, data: task });
        } catch (error) { next(error); }
    }

    async deleteTask(req, res, next) {
        try {
            await taskService.deleteTask(parseInt(req.params.id));
            res.json({ success: true, message: 'Task deleted successfully' });
        } catch (error) { next(error); }
    }

    async getStatistics(req, res, next) {
        try {
            const stats = await taskService.getStatistics();
            res.json({ success: true, data: stats });
        } catch (error) { next(error); }
    }
}

module.exports = new TaskController();
EOF
```

### 2.9 Routes

```bash
cat > api/src/routes/taskRoutes.js << 'EOF'
// src/routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/tasks', (req, res, next) => taskController.getAllTasks(req, res, next));
router.get('/tasks/stats', (req, res, next) => taskController.getStatistics(req, res, next));
router.get('/tasks/:id', (req, res, next) => taskController.getTaskById(req, res, next));
router.post('/tasks', (req, res, next) => taskController.createTask(req, res, next));
router.put('/tasks/:id', (req, res, next) => taskController.updateTask(req, res, next));
router.delete('/tasks/:id', (req, res, next) => taskController.deleteTask(req, res, next));

module.exports = router;
EOF
```

### 2.10 Error Handler Middleware

```bash
cat > api/src/middleware/errorHandler.js << 'EOF'
// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(`❌ Error: ${err.message}`);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
EOF
```

### 2.11 Server Entry Point — ⭐ เพิ่ม Instance ID + Redis

```bash
cat > api/server.js << 'EOF'
// server.js — Entry Point
// แต่ละ Instance มี INSTANCE_ID ไม่ซ้ำกัน เพื่อพิสูจน์ว่า Load Balancing ทำงาน!

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const taskRoutes = require('./src/routes/taskRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { healthCheck: dbHealthCheck } = require('./src/config/database');
const { connectRedis, redisHealthCheck, stats: cacheStats } = require('./src/config/redis');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// 🆔 Instance ID — สุ่มเพื่อแยกแต่ละ Instance
const INSTANCE_ID = `app-${os.hostname().slice(-4)}-${Math.random().toString(36).slice(2, 6)}`;
console.log(`\n🆔 Instance ID: ${INSTANCE_ID}\n`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('short'));

// ⭐ Health Check — แสดง Instance ID + Cache Stats
app.get('/api/health', async (req, res) => {
    const dbStatus = await dbHealthCheck();
    const redisStatus = await redisHealthCheck();
    res.json({
        status: 'ok',
        instanceId: INSTANCE_ID,
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisStatus,
        cache: {
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            hitRate: `${cacheStats.hitRate}%`
        }
    });
});

// API Routes
app.use('/api', taskRoutes);

// Error Handler
app.use(errorHandler);

// Start Server + Connect Redis
const startServer = async () => {
    await connectRedis();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 TaskBoard API running on port ${PORT}`);
        console.log(`🆔 Instance: ${INSTANCE_ID}`);
        console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
    });
};

startServer();
EOF
```

### 2.12 Database Init SQL

```bash
cat > database/init.sql << 'EOF'
-- database/init.sql
-- Task Board Schema + Sample Data

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, description, status, priority) VALUES
    ('ออกแบบ Database Schema', 'สร้าง ER Diagram สำหรับ Task Board', 'DONE', 'HIGH'),
    ('สร้าง REST API', 'Implement CRUD endpoints ด้วย Express.js', 'IN_PROGRESS', 'HIGH'),
    ('สร้าง Frontend UI', 'Kanban board interface', 'TODO', 'MEDIUM'),
    ('เขียน Unit Tests', 'Test coverage > 80%', 'TODO', 'LOW'),
    ('ตั้งค่า Docker', 'Docker Compose สำหรับ development', 'DONE', 'MEDIUM'),
    ('เพิ่ม Redis Cache', 'Cache frequently accessed data', 'IN_PROGRESS', 'HIGH'),
    ('ตั้งค่า Load Balancer', 'Nginx round-robin', 'TODO', 'MEDIUM');
EOF
```

### 2.13 Frontend (Minimal — เน้น Backend Architecture)

```bash
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskBoard — N-Tier + Redis + Load Balancing</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <h1>📋 TaskBoard <small>N-Tier Architecture</small></h1>
        <div id="instance-info">Loading...</div>
    </header>

    <main>
        <section id="stats-panel"></section>

        <section id="add-task">
            <h2>➕ Add Task</h2>
            <form id="task-form">
                <input type="text" id="title" placeholder="Task title..." required>
                <select id="priority">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM" selected>Medium</option>
                    <option value="HIGH">High</option>
                </select>
                <button type="submit">Add</button>
            </form>
        </section>

        <section id="board">
            <div class="column" id="todo"><h2>📝 TODO</h2><div class="tasks"></div></div>
            <div class="column" id="in_progress"><h2>🔄 IN PROGRESS</h2><div class="tasks"></div></div>
            <div class="column" id="done"><h2>✅ DONE</h2><div class="tasks"></div></div>
        </section>
    </main>

    <script src="js/app.js"></script>
</body>
</html>
EOF
```

```bash
cat > frontend/css/style.css << 'EOF'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', sans-serif; background: #f0f2f5; color: #333; }
header { background: #1a73e8; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
header h1 small { font-size: 0.5em; opacity: 0.8; }
#instance-info { background: rgba(255,255,255,0.2); padding: 0.3rem 0.8rem; border-radius: 12px; font-size: 0.8rem; }
main { max-width: 1200px; margin: 1rem auto; padding: 0 1rem; }
#stats-panel { display: flex; gap: 1rem; margin-bottom: 1rem; }
.stat-card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; text-align: center; }
.stat-card .number { font-size: 2rem; font-weight: bold; color: #1a73e8; }
#add-task { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
#task-form { display: flex; gap: 0.5rem; }
#task-form input { flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; }
#task-form select, #task-form button { padding: 0.5rem 1rem; border-radius: 4px; border: 1px solid #ddd; }
#task-form button { background: #1a73e8; color: white; border: none; cursor: pointer; }
#board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.column { background: #ebecf0; border-radius: 8px; padding: 0.8rem; min-height: 300px; }
.column h2 { font-size: 0.9rem; margin-bottom: 0.5rem; }
.task-card { background: white; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.task-card h3 { font-size: 0.9rem; margin-bottom: 0.3rem; }
.task-card .meta { font-size: 0.75rem; color: #666; display: flex; justify-content: space-between; }
.priority-HIGH { border-left: 3px solid #ea4335; }
.priority-MEDIUM { border-left: 3px solid #fbbc04; }
.priority-LOW { border-left: 3px solid #34a853; }
.task-actions { margin-top: 0.5rem; }
.task-actions button { font-size: 0.7rem; padding: 0.2rem 0.5rem; margin-right: 0.3rem; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; background: #f8f9fa; }
EOF
```

```bash
cat > frontend/js/app.js << 'EOF'
// app.js — Frontend Application
const API = '/api';

// Fetch helper
async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    return res.json();
}

// Load health info (shows which instance served the request)
async function loadHealth() {
    try {
        const data = await api('/health');
        document.getElementById('instance-info').innerHTML =
            `🖥️ ${data.instanceId} | Cache Hit: ${data.cache.hitRate}`;
    } catch { document.getElementById('instance-info').textContent = '⚠️ Cannot reach API'; }
}

// Load all tasks
async function loadTasks() {
    try {
        const data = await api('/tasks');
        const tasks = data.data || [];

        ['todo', 'in_progress', 'done'].forEach(status => {
            const container = document.querySelector(`#${status} .tasks`);
            container.innerHTML = tasks
                .filter(t => t.status === status.toUpperCase())
                .map(t => `
                    <div class="task-card priority-${t.priority}">
                        <h3>${t.title}</h3>
                        <div class="meta">
                            <span>${t.priority}</span>
                            <span>${new Date(t.createdAt).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div class="task-actions">
                            ${t.status !== 'DONE' ? `<button onclick="moveTask(${t.id},'${t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'}')">➡️ Next</button>` : ''}
                            ${t.status !== 'IN_PROGRESS' ? `<button onclick="deleteTask(${t.id})">🗑️</button>` : ''}
                        </div>
                    </div>
                `).join('');
        });

        // Load stats
        const statsData = await api('/tasks/stats');
        const s = statsData.data;
        document.getElementById('stats-panel').innerHTML = `
            <div class="stat-card"><div class="number">${s.total}</div>Total</div>
            <div class="stat-card"><div class="number">${s.byStatus.TODO}</div>TODO</div>
            <div class="stat-card"><div class="number">${s.byStatus.IN_PROGRESS}</div>In Progress</div>
            <div class="stat-card"><div class="number">${s.byStatus.DONE}</div>Done</div>
            <div class="stat-card"><div class="number">${s.completionRate}%</div>Completion</div>
        `;
    } catch (error) { console.error('Load error:', error); }
}

// Create task
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
            title: document.getElementById('title').value,
            priority: document.getElementById('priority').value
        })
    });
    document.getElementById('title').value = '';
    loadTasks();
    loadHealth();
});

// Move task status
async function moveTask(id, newStatus) {
    await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    loadTasks();
    loadHealth();
}

// Delete task
async function deleteTask(id) {
    if (!confirm('ลบ Task นี้?')) return;
    await api(`/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
    loadHealth();
}

// Initial load
loadTasks();
loadHealth();
setInterval(loadHealth, 5000);  // Refresh instance info every 5s
EOF
```

### ✅ Checkpoint 2: Backend Code ครบ!

---

## Part 3: Nginx Load Balancer (30 นาที)

### 3.1 Nginx Configuration — ⭐ เพิ่ม Load Balancing

```bash
cat > nginx/nginx.conf << 'EOF'
# nginx.conf — Main Config
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # Logging
    log_format main '$remote_addr - $request [$status] → upstream: $upstream_addr ($request_time s)';
    access_log /var/log/nginx/access.log main;

    include /etc/nginx/conf.d/*.conf;
}
EOF
```

```bash
cat > nginx/conf.d/default.conf << 'EOF'
# ==============================================================
# Nginx Load Balancer Configuration
# ENGSE207 Term Project Week 6
#
# 📌 Round-Robin Load Balancing:
# Request 1 → app:3000 (instance 1)
# Request 2 → app:3000 (instance 2)
# Request 3 → app:3000 (instance 3)
# Request 4 → app:3000 (instance 1) ... วนรอบ
#
# Docker Compose DNS จะ resolve "app" เป็น IP ของทุก instance
# ==============================================================

upstream app_servers {
    # Docker Compose จะ resolve ชื่อ "app" เป็น IP ของทุก instance
    # เมื่อ scale=3 จะได้ 3 IPs
    server app:3000;

    # Keepalive connections เพื่อ reuse TCP connections
    keepalive 32;
}

server {
    listen 80;
    server_name localhost;

    # Serve frontend static files
    root /usr/share/nginx/html;
    index index.html;

    # API Proxy → Load Balance across app instances
    location /api/ {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Add header to show which upstream served the request
        add_header X-Served-By $upstream_addr always;

        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|ico)$ {
        expires 1d;
        add_header Cache-Control "public";
    }
}
EOF
```

### ✅ Checkpoint 3: Nginx Config พร้อม

---

## Part 4: Docker Compose + Scale (30 นาที)

### 4.1 Docker Compose — ⭐ เพิ่ม Redis + Scalable App

```bash
cat > docker-compose.yml << 'EOF'
# ==============================================================
# Docker Compose — N-Tier + Redis + Load Balancing
# ENGSE207 Term Project Week 6
#
# Services:
#   1. db     — PostgreSQL (Persistent Data)
#   2. redis  — Redis (Cache Layer) ← NEW!
#   3. app    — Node.js API ×3 instances ← SCALABLE!
#   4. nginx  — Load Balancer + Static Files
#
# Usage:
#   docker compose up -d --scale app=3
#   docker compose logs -f app
#   docker compose down -v
# ==============================================================

services:
  # === Database (Tier 3b) ===
  db:
    image: postgres:16-alpine
    container_name: taskboard-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-taskboard_db}
      POSTGRES_USER: ${POSTGRES_USER:-taskboard}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-taskboard123}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-taskboard}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - taskboard-ntier

  # === Redis Cache (Tier 3a) — NEW! ===
  redis:
    image: redis:7-alpine
    container_name: taskboard-redis
    restart: unless-stopped
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - taskboard-ntier

  # === App Server (Tier 2) — SCALABLE! ===
  # ไม่ใส่ container_name เพื่อให้ scale ได้
  app:
    build:
      context: ./api
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=${DB_NAME:-taskboard_db}
      - DB_USER=${DB_USER:-taskboard}
      - DB_PASSWORD=${DB_PASSWORD:-taskboard123}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_TTL=60
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - taskboard-ntier
    # ไม่ expose port ออกนอก — ให้ Nginx เป็นทางเข้าเดียว

  # === Nginx Load Balancer (Tier 1) ===
  nginx:
    image: nginx:alpine
    container_name: taskboard-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./frontend:/usr/share/nginx/html:ro
    depends_on:
      - app
    networks:
      - taskboard-ntier

networks:
  taskboard-ntier:
    driver: bridge

volumes:
  postgres_data:
EOF
```

### 4.2 Build และ Start ระบบ!

```bash
# 🚀 Build และ Start ด้วย 3 App Instances
docker compose up -d --build --scale app=3

# ตรวจสอบสถานะ
docker compose ps

# ดู logs ของทุก app instance
docker compose logs -f app
```

**ผลลัพธ์ที่คาดหวัง:**

```
NAME                  SERVICE   STATUS    PORTS
taskboard-db          db        running   5432/tcp
taskboard-redis       redis     running   6379/tcp
week6-app-1           app       running   3000/tcp
week6-app-2           app       running   3000/tcp
week6-app-3           app       running   3000/tcp
taskboard-nginx       nginx     running   0.0.0.0:80->80/tcp
```

### ✅ Checkpoint 4: ระบบทำงานแล้ว!

เปิด http://localhost — ควรเห็น TaskBoard UI

---

## Part 5: Testing & Monitoring (30 นาที)

### 5.1 ทดสอบ Load Balancing

```bash
# เรียก Health Check 6 ครั้ง — ดู instanceId เปลี่ยนไปมา!
echo "=== Testing Load Balancing (Round-Robin) ==="
for i in $(seq 1 6); do
    RESPONSE=$(curl -s http://localhost/api/health | grep -o '"instanceId":"[^"]*"')
    echo "Request $i: $RESPONSE"
    sleep 0.5
done
```

**ผลลัพธ์ที่คาดหวัง (Instance ID สลับกัน):**
```
Request 1: "instanceId":"app-a1b2-x9y8"
Request 2: "instanceId":"app-c3d4-z7w6"
Request 3: "instanceId":"app-e5f6-v5u4"
Request 4: "instanceId":"app-a1b2-x9y8"   ← วนรอบ!
Request 5: "instanceId":"app-c3d4-z7w6"
Request 6: "instanceId":"app-e5f6-v5u4"
```

### 5.2 ทดสอบ Redis Caching

```bash
echo "=== Testing Redis Cache ==="

# Request 1 — CACHE MISS (ไปดึงจาก DB)
echo "--- Request 1 (expect MISS) ---"
curl -s http://localhost/api/tasks | python3 -m json.tool | head -5
echo ""

# Request 2 — CACHE HIT (ได้จาก Redis)
echo "--- Request 2 (expect HIT) ---"
curl -s http://localhost/api/tasks | python3 -m json.tool | head -5
echo ""

# ดู Cache Stats
echo "--- Cache Stats ---"
curl -s http://localhost/api/health | python3 -m json.tool
```

### 5.3 ทดสอบ Cache Invalidation

```bash
# สร้าง Task ใหม่ (จะ invalidate cache)
curl -s -X POST http://localhost/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Cache Invalidation","priority":"HIGH"}' | python3 -m json.tool

# Request ถัดไปควรเป็น MISS (cache ถูก invalidate)
# จากนั้นเป็น HIT
curl -s http://localhost/api/health | python3 -m json.tool
```

### 5.4 Load Testing (Simple)

```bash
# Simple load test — 100 requests
echo "=== Load Test: 100 requests ==="
START=$(date +%s%N)
for i in $(seq 1 100); do
    curl -s -o /dev/null http://localhost/api/tasks
done
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
echo "100 requests completed in ${DURATION}ms"
echo "Average: $((DURATION / 100))ms per request"
```

### 5.5 ดู Redis Keys

```bash
# ดู keys ที่อยู่ใน Redis
docker exec taskboard-redis redis-cli KEYS "tasks:*"

# ดูค่าใน key
docker exec taskboard-redis redis-cli GET "tasks:all"

# ดูสถิติ Redis
docker exec taskboard-redis redis-cli INFO stats | grep -E "keyspace|hit|miss"
```

### ✅ Checkpoint 5: ทดสอบเรียบร้อย!

---


## Part 6: ทดลอง Availability และ Scalability (45 นาที)

> **เป้าหมายของ Part นี้:**  
> 1) จำลอง “เหตุการณ์จริง” ที่ API instance หยุดทำงานบางตัว แล้วระบบควรยังให้บริการได้ (High Availability)  
> 2) วัดผล “การกระจายโหลด” ว่าเพิ่มจำนวน API instances แล้ว **เวลาเฉลี่ย** และ **Throughput** ดีขึ้นแค่ไหน (Scalability)

---

### สถานการณ์ที่ 1: ปิด API app บางตัวแล้ว Frontend ใช้งานไม่ได้ (ต้อง restart/reload Nginx)

#### 6.1 อธิบายเหตุการณ์ที่มักเกิดขึ้น
ในแลบนี้ `nginx` ทำหน้าที่เป็น Load Balancer ส่งคำขอไปยัง service `app` ที่มีหลาย instances (เช่น 3 ตัว)  
แต่ถ้าเราปิด `app` บางตัว (เช่น `week6-app-2`) แล้วพบว่า:

- บางครั้งหน้าเว็บเรียก API ไม่ได้ / ได้ `502 Bad Gateway` หรือ `504 Gateway Timeout`
- บางครั้งต้อง **restart nginx container** ถึงจะกลับมาใช้งานได้

**สาเหตุหลัก (เข้าใจแบบสถาปัตยกรรม):**
- `app` เป็น “ชื่อ DNS” ใน Docker network ซึ่งชี้ไปหลาย IP (ตามจำนวน instance)
- Nginx (โดยค่าเริ่มต้น) จะ resolve รายชื่อ IP ตอนเริ่มทำงาน แล้ว “จำ” ไว้
- เมื่อ instance ใดหยุดทำงาน IP นั้น “หายไป” ใน DNS แต่ Nginx ยังพยายามส่ง request ไป IP เก่า → เกิด error
- และใน config เดิมยังไม่ได้เปิดโหมด **failover / retry upstream** ทำให้ request ที่ชน instance ที่ล่ม “ล่มตาม” ทันที

> ✅ จุดเรียนรู้: **Load Balancing ≠ High Availability อัตโนมัติ**  
> ต้องมี **Failover + Retry + Service Discovery (DNS re-resolve)**

---

#### 6.2 ทดลองให้เจอปัญหา (Reproduce ตามเหตุการณ์จริง)

1) เริ่มระบบด้วย 3 instances
```bash
docker compose up -d --build --scale app=3
docker compose ps
```

2) ยิง health check ดูการสลับ instance (ควรเห็น `instanceId` เปลี่ยนไปมา)
```bash
for i in $(seq 1 12); do
  echo -n "Request $i: "
  curl -s http://localhost/api/health | grep -o '"instanceId":"[^"]*"'
  sleep 0.3
done
```

3) ปิด API app 1 ตัว (ตัวอย่าง: `week6-app-2`)
```bash
docker stop week6-app-2
```

4) ทดสอบซ้ำ (ให้ลองหลายครั้ง/หลายรอบ)
```bash
for i in $(seq 1 30); do
  echo -n "Request $i: "
  curl -s -m 2 http://localhost/api/health | grep -o '"instanceId":"[^"]*"' || echo "❌ FAILED"
  sleep 0.2
done
```

✅ **สิ่งที่อาจพบ (ข้อสังเกต):**
- มีบาง request ล้ม (`FAILED`) เพราะไปชน upstream ที่หยุดทำงาน
- บางเครื่อง/บางจังหวะ อาจดูเหมือน “หน้าเว็บใช้ไม่ได้เลย” เพราะเบราว์เซอร์ retry แล้วชนจังหวะล้มซ้ำ ๆ
- ถ้าคุณสลับปิดเพิ่มอีก 1 ตัว (เหลือ 1 ตัว) อาการจะชัดขึ้นมาก

> 💡 บันทึกลงรายงาน:  
> - จำนวนครั้งที่ล้มจากทั้งหมด 30 requests  
> - error ที่เห็นใน browser devtools (ถ้ามี) เช่น 502/504  
> - พฤติกรรม: “ล้มเป็นบางครั้ง” หรือ “ล้มเกือบทั้งหมด”

---

#### 6.3 แก้ไข: ปรับ `nginx/conf.d/default.conf` ให้ “ไม่ต้อง restart nginx ทุกครั้ง”

**แนวคิดการแก้:**
1) ให้ Nginx “ถาม DNS ของ Docker” เป็นระยะ (re-resolve)  
2) เมื่อ upstream ตัวใดล่ม ให้ **retry ไปตัวอื่น** อัตโนมัติ (failover)

ให้แก้ไฟล์ `nginx/conf.d/default.conf` เป็นเวอร์ชันนี้ (แทนที่ทั้งไฟล์):

```nginx
# ==============================================================
# Nginx Load Balancer Configuration (Improved for Availability)
# ENGSE207 Term Project Week 6 — Part 6
#
# ✅ เป้าหมาย:
#  - Re-resolve DNS ของ service "app" เมื่อ instances เปลี่ยน
#  - Retry/failover เมื่อบาง instance ล่ม (ไม่ต้อง restart nginx)
# ==============================================================

# Docker embedded DNS in containers
resolver 127.0.0.11 valid=5s ipv6=off;

upstream app_servers {
    # แชร์ state ของ upstream (จำเป็นต่อการ re-resolve แบบ dynamic ในหลายกรณี)
    zone app_servers 64k;

    # resolve = ให้ Nginx อัปเดตรายชื่อ IP ของ "app" ตาม DNS ได้
    server app:3000 resolve
        max_fails=1 fail_timeout=3s;

    # Keepalive connections
    keepalive 32;
}

server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://app_servers;

        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # ✅ ถ้าเจอ error/timeout ให้ลอง upstream ตัวอื่น
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 3;

        # ✅ ทำให้ failover เร็วขึ้น
        proxy_connect_timeout 1s;
        proxy_read_timeout 10s;

        add_header X-Served-By $upstream_addr always;

        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') { return 204; }
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

จากนั้น “ทดสอบ config” และ “reload” (ไม่ต้อง restart container)

```bash
# ตรวจ syntax
docker exec -it taskboard-nginx nginx -t

# reload config (ไม่ restart)
docker exec -it taskboard-nginx nginx -s reload
```

---

#### 6.4 ทดลองซ้ำหลังแก้ (Expected Result)

1) ให้แน่ใจว่า scale ยังเป็น 3 (หรือเริ่มใหม่)
```bash
docker compose up -d --scale app=3
```

2) ปิด app 1 ตัวอีกครั้ง
```bash
docker stop week6-app-2
```

3) ยิง health check ซ้ำ 30 ครั้ง
```bash
for i in $(seq 1 30); do
  echo -n "Request $i: "
  curl -s -m 2 http://localhost/api/health | grep -o '"instanceId":"[^"]*"' || echo "❌ FAILED"
  sleep 0.2
done
```

✅ **ผลที่คาดหวังหลังแก้:**
- request ส่วนใหญ่ควร “ยังตอบได้ต่อเนื่อง”
- อาจมีหลุด 1–2 ครั้งได้ในบางเครื่อง/บางจังหวะ (ขึ้นกับ timeout/สภาพเครื่อง) แต่ไม่ควร “ล่มยาว”

> 💡 ถ้ายังพบอาการล่มถี่:  
> - ลองลด `fail_timeout` ให้สั้นลง  
> - หรือปิด `keepalive` ชั่วคราวเพื่อดูผลต่าง (เพื่อการทดลอง)  
> - ตรวจว่า Nginx image เวอร์ชันใหม่พอ (nginx:alpine ปกติใหม่อยู่)

---

### สถานการณ์ที่ 2: ทดสอบโหลดสูง — 1 instance vs หลาย instances (วัดเวลาเฉลี่ย/Throughput)

> ใน Part 5.4 เราทำ load test แบบง่าย ๆ (loop curl)  
> ตอนนี้เราจะทำการทดลองเชิง “วัดผล” ให้ชัดขึ้น และเปรียบเทียบก่อน/หลัง scaling

#### 6.5 เตรียมเครื่องมือ Load Test
แนะนำใช้ **wrk** (ได้สถิติ Latency/Requests per sec)

- macOS (Homebrew): `brew install wrk`
- Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y wrk`

ถ้าไม่อยากติดตั้งบนเครื่อง สามารถใช้ Docker ได้ (แต่ต้องอยู่ใน network เดียวกับ compose)
```bash
# หา network ชื่อที่มีคำว่า taskboard-ntier
docker network ls | grep taskboard-ntier
```
แล้วใช้คำสั่งประมาณนี้ (แทน <NETWORK_NAME> ตามที่พบ):
```bash
docker run --rm --network <NETWORK_NAME> williamyeh/wrk   -t4 -c50 -d20s http://nginx/api/tasks
```

---

#### 6.6 Test A: มีแค่ 1 API app instance (Baseline)

1) เหลือ 1 instance
```bash
docker compose up -d --scale app=1
docker compose ps
```

2) Warm-up 1 ครั้ง (ให้ระบบพร้อม)
```bash
curl -s http://localhost/api/tasks > /dev/null
```

3) รัน wrk (20 วินาที)
```bash
wrk -t4 -c50 -d20s http://localhost/api/tasks
```

ให้จดค่าจากผลลัพธ์:
- **Requests/sec**
- **Latency (avg)**
- (ถ้ามี) p95/p99

---

#### 6.7 Test B: เพิ่มเป็น 3 API app instances (Scale-out)

1) เพิ่มเป็น 3 instances
```bash
docker compose up -d --scale app=3
docker compose ps
```

2) Warm-up
```bash
curl -s http://localhost/api/tasks > /dev/null
```

3) รัน wrk ด้วยพารามิเตอร์เดิม
```bash
wrk -t4 -c50 -d20s http://localhost/api/tasks
```

---

#### 6.8 บันทึกผล และสรุป (กรอกตาราง)

ให้เติมผลการทดลองลงตารางนี้:

| Case | #App Instances | Concurrency (c) | Duration | Avg Latency | Requests/sec | สรุป |
|---|---:|---:|---:|---:|---:|---|
| A | 1 | 50 | 20s | ____ ms | ____ | baseline |
| B | 3 | 50 | 20s | ____ ms | ____ | after scale-out |

✅ **คำถามชวนคิด (Discussion):**
1) เพิ่ม instance แล้ว **Avg Latency ลดลงไหม?** ลดลงมาก/น้อย เพราะอะไร  
2) เพิ่ม instance แล้ว **Requests/sec เพิ่มขึ้นไหม?** เพิ่มขึ้นเป็นสัดส่วนหรือไม่  
3) ถ้าผล “ไม่ดีขึ้นมาก” ให้ลองวิเคราะห์ bottleneck ว่าอยู่ที่ไหน  
   - DB (Postgres) เป็นคอขวด?  
   - Redis/Network เป็นคอขวด?  
   - Nginx เป็นคอขวด?  
4) ถ้าจะทำให้สเกลได้จริงในระบบใหญ่ ต้องเพิ่มอะไรอีกบ้าง  
   (เช่น read replica DB, caching strategy, async job queue, rate limit)

---

### ✅ Checkpoint 6: ทำ Availability + Scalability Experiment สำเร็จ!
- [ ] ทดลอง reproduce ปัญหา “ปิด instance แล้วล่ม” ได้  
- [ ] ปรับ `default.conf` และ reload Nginx โดยไม่ restart container  
- [ ] ทำ load test แบบ 1 instance vs 3 instances และมีตารางผลลัพธ์


---

## Part 7: สรุปและเปรียบเทียบ

### เปรียบเทียบ Week 6 เดิม vs Term Project Week 6

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Week 6 เดิม (Basic Docker)          Term Project Week 6 (Advanced)          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Containers: 3                       Containers: 6 (3 app + db + redis +    │
│  • nginx + api + db                  nginx)                                 │
│                                                                             │
│  App Instances: 1                    App Instances: 3 (scalable)            │
│  Cache: ❌ ไม่มี                       Cache: ✅ Redis (TTL-based)            │
│  Load Balancing: ❌                  Load Balancing: ✅ Nginx Round-Robin   │
│  Health Check: Basic                 Health Check: ✅ แสดง Instance ID +    │
│                                      Cache Stats                            │
│                                                                             │
│  Scaling: ❌ ทำไม่ได้                  Scaling: ✅ docker compose --scale     │
│  Fault Tolerance: ❌ ถ้า API ล่ม=จบ    Fault Tolerance: ✅ ยังมี instance อื่น    │
│                                                                             │
│  Quality Attributes:                 Quality Attributes:                    │
│  Performance:  ★★☆☆☆                 Performance: ★★★★☆ (Cache)             │
│  Scalability:  ★☆☆☆☆                 Scalability: ★★★★☆ (Multi-Instance)    │
│  Availability: ★★☆☆☆                 Availability: ★★★★☆ (Redundancy)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏆 Challenge: ทำต่อเอง

| ระดับ | Challenge | คำแนะนำ |
|:--:|:--|:--|
| ⭐ | เพิ่ม cache สำหรับ `GET /tasks/:id` | ดูตัวอย่าง `getTaskById` ใน Service Layer |
| ⭐⭐ | เพิ่ม `X-Cache-Status` header (HIT/MISS) ใน response | เพิ่ม middleware ที่เช็ค cache ก่อน |
| ⭐⭐⭐ | เปลี่ยน Load Balancing เป็น Least Connections | ศึกษา `least_conn` ใน nginx upstream |

---

## 📤 การส่งงานทาง Git

```bash
cd ~/term-project/week6-ntier-redis

# ตรวจสอบไฟล์
git status

# Commit
git add -A
git commit -m "Week 6: N-Tier Architecture with Redis Caching + Load Balancing

- Added Redis caching layer (Cache-Aside pattern)
- Configured Nginx load balancing (Round-Robin, 3 instances)
- Health check endpoint with instance ID + cache stats
- Docker Compose with --scale support
- Load testing shows improved response times"

# Push
git push origin main
```

### Deliverables Checklist

| ✅ | รายการ |
|---|-------|
| ☐ | `docker-compose.yml` ที่รัน `docker compose up --scale app=3` ได้ |
| ☐ | Redis caching ทำงาน (เห็น HIT/MISS ใน logs) |
| ☐ | Load Balancing ทำงาน (Instance ID สลับกัน) |
| ☐ | Frontend แสดง Task Board + Instance Info |
| ☐ | Health Check endpoint แสดง Cache Stats |
| ☐ | Git commit พร้อม message อธิบาย |

---

*ENGSE207 Software Architecture — Term Project Week 6*
*Instructor: นายธนิต เกตุแก้ว — มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา*