---
title: Jenkins 流水线难点：节点、JUnit 邮件、压缩包透传
date: "2026-11-02"
tags: [Jenkins, Agent, JUnit]
category: 命令
summary: Controller 只编排。JUnit 先落成 xml 再写成邮件。压缩包用构建号透传，不用 lastSuccessful。
draft: false
---

Controller 负责排队和触发，用例、编译和安装都在挂着标签 `XXXX` 的 Agent 上。下面三件事是流水线里容易配错的地方。节点本身怎么装，见《从零搭起 Jenkins：Controller 和 Windows Agent》。

`XXXX` 换成自己的任务名、路径、收件人和文件名。

## 1. Controller 怎么控制 Agent

任务里写 `agent { label 'XXXX' }`。Controller 只把构建派给标签对得上、并且当前在线的节点。

控制台第一行应是 `Running on XXXX`。停在 `Waiting for next available executor`，是标签不一致，或 Agent 已经掉线。

Agent 掉线时，正在跑的这一次构建直接失败，节点过后再上线也不会把这次构建接着跑。下一轮要重新触发。

Jenkins 的 `WORKSPACE` 和机器上固定的业务目录 `XXXX` 不是同一个文件夹。`dir('XXXX')` 只影响其中的 `bat`。后面的 `copyArtifacts` 不跟着 `dir` 走。

## 2. JUnit 和邮件

测试命令加上 JUnit 输出，例如 pytest 的 `--junitxml=report.xml`。`post { always { ... } }` 里发布，这样失败了也还有结果：

```groovy
junit allowEmptyResults: true, testResults: 'report.xml'
```

一次构建里连续跑多套用例时，后一套会覆盖 `report.xml`。每一套结束先复制走：

```bat
copy /Y report.xml XXXX\XXXX.xml
```

趋势图要包含这些副本时，`testResults` 写成 `report.xml,XXXX/**/*.xml`。只写 `report.xml`，页面上就只剩最后一套。

邮件不靠 JUnit 插件自己发。先由脚本根据 `report.xml` 生成 `XXXX.html`，再交给 `emailext`。SMTP 在 Manage Jenkins → System → Extended E-mail Notification 里配置，服务器、端口、账号都填 `XXXX`。任务参数里的收件人覆盖系统默认收件人。

通过和失败用两个参数：

- `XXXX`：通过时的收件人
- `XXXX`：失败时的收件人

```groovy
def mailTo = (currentBuild.currentResult == 'SUCCESS') ? params.XXXX : params.XXXX
emailext(
    subject: "[${currentBuild.currentResult}] XXXX",
    body: readFile('XXXX.html'),
    to: mailTo,
    mimeType: 'text/html',
    attachmentsPattern: 'report.xml,XXXX.html'
)
```

两套任务如果共用 Agent 上的同一个目录，后一套开始前先删掉上一封 `XXXX.html`。正文里放一个只有本任务才有的标记；读出来的正文没有这个标记，就不要发。否则后一套会把前一套留在磁盘上的邮件发出去。

脚本没有生成 html，就跳过 `emailext`。不要在脚本失败后再发一封只有「构建失败了」的空邮件。

下游任务的收件人要在触发时当作参数传进去。下游不会继承上游参数名。上游失败名单如果要给下游用，触发时写进下游的 `XXXX` 参数。

## 3. 编译压缩包怎么透传

编译任务和测试任务经常不在同一台 Agent 上。压缩包不要靠共享文件夹硬拷，走归档。

上游打好包，并写一个清单，清单里记下压缩包文件名：

```groovy
archiveArtifacts artifacts: 'XXXX.zip,XXXX.json', fingerprint: true
```

然后触发下游，把**这次**构建号传过去。`wait: false` 时上游还没结束，下游若用 `lastSuccessful()`，拿到的是上一次成功的包，不是刚刚打出来的这一份。

```groovy
build job: 'XXXX',
    parameters: [
        string(name: 'XXXX_BUILD_NUMBER', value: env.BUILD_NUMBER),
        string(name: 'XXXX_JOB', value: env.JOB_NAME),
    ],
    wait: false,
    propagate: false
```

下游按构建号复制。`target` 相对 `WORKSPACE`，不要写成业务目录里的路径。`flatten: true` 时文件直接落在 `target` 下，不再带子目录。

```groovy
copyArtifacts(
    projectName: params.XXXX_JOB,
    selector: specific(params.XXXX_BUILD_NUMBER),
    filter: 'XXXX.zip,XXXX.json',
    target: 'XXXX',
    flatten: true,
    optional: false
)
```

复制之后先读清单里的文件名，再去 `WORKSPACE\XXXX` 里找这个文件。清单没有，再按 `XXXX.zip` 列一次目录。两边都没有，就停。不要拿工作区里上一次留下的旧压缩包继续安装。

上游任务要允许下游复制制品。打开上游任务的配置，Permission to Copy Artifact 里写上下游任务名 `XXXX`。没开这项时，下游的 `copyArtifacts` 会空，目录里什么都没有。

装到业务目录是另一步：从 `WORKSPACE\XXXX` 复制到业务目录 `XXXX`，再调用安装命令。安装命令跟 `copyArtifacts` 一样，不要假设当前目录已经是业务目录。
