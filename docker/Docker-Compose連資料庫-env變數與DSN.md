---
title: "Docker Compose 怎麼連資料庫：env 變數 → DSN → MySQL 握手"
tags: [docker, docker-compose, env, mysql, golang, 票務系統專案]
---

# Docker Compose 怎麼連資料庫：env 變數 → DSN → MySQL 握手

主檔是互動版 HTML（含流程圖、是非題、申論題）：[[Docker-Compose連資料庫-env變數與DSN-互動版.html]]

一句話：compose 把 `environment:` 注入容器 → Go 用 getEnv 讀出來拼成 DSN → GORM 開 TCP 連到 service 名稱 `mysql` → MySQL 用帳號密碼握手認證，不是 tokenization。

相關：[[00-Docker學習路線-索引]]（第 6、7 站）、[[compose-dev-references-dockerfile-dev-and-mysql-host-check]]、[[air-docker-compose]]
