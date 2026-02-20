# Bash 指令笔记（Claude 协作版）

## mysqldump - 导出数据库结构

### 基本语法

```bash
mysqldump -h 主机 -P 端口 -u 用户名 -p'密码' --no-data 数据库名 > 输出文件.sql
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `-h` | 主机地址 (host) |
| `-P` | 端口号 (Port，注意是大写P) |
| `-u` | 用户名 (user) |
| `-p'密码'` | 密码（紧跟 -p，无空格）|
| `--no-data` | 只导出结构，不导出数据 |
| `>` | 重定向输出到文件 |

### 实际案例

```bash
# 使用 Docker 运行 mysqldump（当本地没有 mysql 客户端时）
docker run --rm mysql:8.0 mysqldump \
  -h hnd1.clusters.zeabur.com \
  -P 32195 \
  -u root \
  -p'<MYSQL_PASSWORD>' \
  --no-data \
  future_sign_prod \
  > sql/futuresign_prod_dump_20260124.sql
```

### 常见问题

#### ⚠️ 警告：密码不安全

**问题**：执行命令后看到以下警告
```
mysqldump: [Warning] Using a password on the command line interface can be insecure.
```

**解答**：
- ✅ 这只是**警告**，不是错误
- ✅ 命令**已经成功执行**了
- ✅ 文件应该已经生成了
- ⚠️ 这个警告是提醒你：密码暴露在命令行中可能被其他用户看到
- 💡 对于一次性操作，可以忽略这个警告

**如何验证成功**：
```bash
# 检查文件是否生成
ls -lh sql/futuresign_prod_dump_20260124.sql

# 如果看到文件大小（例如 613K），就表示成功了！
```

#### 没有 mysqldump 命令

**问题**：
```
mysqldump: command not found
```

**解决方案**：使用 Docker
```bash
docker run --rm mysql:8.0 mysqldump [其他参数...]
```

---

## ls - 列出文件

### 常用选项

```bash
ls              # 列出当前目录文件
ls -l           # 详细格式（long format）
ls -h           # 人类可读的文件大小（human-readable）
ls -lh          # 组合：详细 + 可读大小
ls -a           # 显示隐藏文件（all）
ls -lha         # 全部组合
```

### 输出说明

```bash
$ ls -lh sql/futuresign_prod_dump_20260124.sql
-rw-r--r-- 1 User 197121 613K Jan 24 15:47 sql/futuresign_prod_dump_20260124.sql
│          │ │    │      │    │        │
│          │ │    │      │    │        └─ 文件名
│          │ │    │      │    └─ 修改日期时间
│          │ │    │      └─ 文件大小（613KB）
│          │ │    └─ 用户组ID
│          │ └─ 用户名
│          └─ 连接数
└─ 权限（r=读 w=写 x=执行）
```

---

## diff - 比较文件差异

### 基本用法

```bash
diff file1.txt file2.txt          # 简单比较
diff -u file1.txt file2.txt       # 统一格式（unified format）
diff -u file1 file2 > diff.txt    # 保存差异到文件
```

### 输出符号说明

```
---  第一个文件
+++  第二个文件
-    第一个文件有，第二个文件没有（删除）
+    第二个文件有，第一个文件没有（新增）
```

### 实际案例

```bash
# 比较两个数据库 schema
diff -u sql/futuresign_prod_dump_20260124.sql sql/futuresign_dev_dump_20260121_151711.sql > sql/schema_diff.txt
```

---

## grep - 搜索文本

### 基本用法

```bash
grep "搜索内容" 文件名              # 搜索并显示匹配行
grep -c "搜索内容" 文件名           # 计数（count）
grep "CREATE TABLE" *.sql         # 搜索多个文件
```

### 实际案例

```bash
# 统计 SQL 文件中有多少个表
grep -c "CREATE TABLE" dump.sql

# 列出所有表名
grep "CREATE TABLE" dump.sql
```

---

## pipe (管道) |

### 概念

```bash
命令1 | 命令2
```
- 把**命令1的输出**作为**命令2的输入**
- 可以无限串接

### 实际案例

```bash
# 找出所有表名并排序
grep "CREATE TABLE" dump.sql | sort

# 找出所有表名，排序，然后保存到文件
grep "CREATE TABLE" dump.sql | sort > tables.txt

# 复杂案例：搜索 → 排序 → 只看前10个
grep "CREATE TABLE" dump.sql | sort | head -10
```

---

## 重定向符号

```bash
>     # 输出重定向（覆盖）
>>    # 输出重定向（追加）
<     # 输入重定向
2>    # 错误输出重定向
2>&1  # 把错误输出合并到标准输出
```

### 实际案例

```bash
# 覆盖写入
echo "hello" > file.txt

# 追加写入
echo "world" >> file.txt

# 忽略错误信息
command 2>/dev/null

# 错误和正常输出都保存
command > output.txt 2>&1
```

---

## 作者笔记

### 2026-01-24 - mysqldump 首次使用

**任务**：导出生产数据库的 schema

**遇到的困惑**：
1. 执行命令后出现 warning，以为命令失败了
2. 不知道如何确认是否成功

**解决方法**：
1. ✅ Warning 不是错误，只是安全提示
2. ✅ 使用 `ls -lh` 检查文件大小，确认导出成功
3. ✅ 如果文件大小合理（不是 0KB），就表示成功了

**经验教训**：
- Bash 命令成功时通常**不会有输出**（"no news is good news"）
- Warning ≠ Error
- 遇到 Warning 先检查**结果**而不是停下来
