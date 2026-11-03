---
title: 从零搭起 Jenkins：Controller 和 Windows Agent
date: "2026-11-02"
tags: [Jenkins, Agent]
category: 命令
summary: 一台机器装 Controller，另一台用入站 Agent 连上来。名字、目录、标签和密钥用 XXXX 填自己的值。
draft: false
---

Controller 放在一台一直开着的机器上，只开网页。跑用例的 Windows 机器当 Agent，由它主动连 Controller。构建跑在 Agent 上，不跑在 Controller 那台机器上。

下面的 `XXXX` 换成自己的名字、地址、目录和标签。

## 1. 安装 Controller

Controller 那台机器安装 Temurin JDK 17 或 21，再装 Jenkins Windows 安装包。安装程序会把它注册成 Windows 服务，默认端口 8080。

浏览器打开 `http://XXXX:8080`。初始管理员密码在 Jenkins 主目录的 `secrets\initialAdminPassword`。主目录看服务里的 `JENKINS_HOME`；安装包默认常常是 `C:\ProgramData\Jenkins\.jenkins`。

向导里选安装推荐插件，然后单独建一个管理员账号。不要停在安装向导的匿名状态。

还要启用的插件记在这里：Pipeline、Git、Credentials、`XXXX`。

## 2. 新建永久 Agent

Manage Jenkins → Nodes → New Node。类型选 Permanent Agent。

| 项 | 填什么 |
|---|---|
| Name | `XXXX`。改名后，Agent 机器上的启动命令也要改 |
| Remote root directory | `XXXX`。这是 Jenkins 的工作目录，不是业务仓库所在的目录 |
| Labels | `XXXX`，与 Jenkinsfile 里的 `agent { label '...' }` 逐字相同 |
| Usage | Only build jobs with label expressions matching this node |
| Launch method | Launch agent by connecting it to the controller |

标签区分大小写。`xxxx` 和 `XXXX` 是两个标签。

保存后，节点页会给出 `agent.jar` 的下载链接和一行 `java -jar` 命令，里面有这段安装才有效的 secret。secret 不进 Git。Controller 重装之后 secret 会变，Agent 机器上的命令要换成新的。

## 3. 把 Agent 拉起来

Agent 机器同样安装 JDK 17 或 21，并安装 Git。流水线从 Git 拉代码时，检出发生在 Agent 上，Controller 那台机器上有 Git 不够。

把节点页的命令拿到 Agent 机器上跑。勾了 WebSocket 时，命令里带 `-webSocket`。Agent 只需要能访问 Controller 的 8080，Controller 不必反向连进 Agent。

```bat
java -jar agent.jar -url http://XXXX:8080/ -secret XXXX -name XXXX -webSocket -workDir XXXX
```

这个窗口一关，节点就掉线。要在重启后自己连上，把同一条命令装成 Windows 服务。服务账户用跑用例时实际登录的那个用户，不要用 Local System。跟登录用户绑定的配置，System 账户看不到。

节点页变成在线之后再创建任务。只在 Controller 上看见曾经绿过，不能说明这次开机已经连上。

## 4. 第一个 Pipeline 任务

New Item → Pipeline。

Definition 选 Pipeline script from SCM。

- SCM 选 Git，填仓库地址 `XXXX`。私有仓库用 Credentials 里的用户名和令牌，令牌不写进 Jenkinsfile。
- Branch 填要跑的分支，例如 `*/main`。
- Script Path 填仓库里的文件名，例如 `XXXX`。

保存后构建一次。第一次若停在 Script Approval，到 Manage Jenkins → In-process Script Approval 里放行，再重跑。

控制台开头应出现 `Running on XXXX`。若出现 `Waiting for next available executor`，是标签没对上，或 Agent 不在线。

可以先放一段只打印节点名的流水线，确认任务跑在 Agent 上，再换成真正的 Jenkinsfile。

```groovy
pipeline {
    agent { label 'XXXX' }
    stages {
        stage('where') {
            steps {
                bat 'echo on %NODE_NAME% %WORKSPACE%'
            }
        }
    }
}
```

## 5. 重装时对着检查

- Controller 服务是启动的，网页能打开。
- Agent 服务是启动的，节点页是在线，不是上次留下的离线记录。
- 启动命令里的 secret、节点名、`-url` 和现在的 Controller 一致。
- 节点标签和 Jenkinsfile 的 `label` 逐字相同。
- 服务账户是跑用例的那个用户。该用户下能执行这次构建要用的命令。
- 检出的是 Git 上的分支。Agent 工作区里还没提交的修改，定时任务不会跑到。
