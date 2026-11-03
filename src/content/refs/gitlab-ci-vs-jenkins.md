---
title: GitLab CI 和 Jenkins 的配置差在哪
date: "2026-11-02"
tags: [GitLab CI, Jenkins, 测试开发]
category: 命令
summary: 仓库触发配在 GitLab CI，占测试机、定时和上下游制品配在 Jenkins。两边的标签、密钥和报告互不相通。
draft: false
---

脚本进 Git。仓库变更和合并请求由 GitLab CI 看。占住测试机、按定时或上游结果开跑、收集报告，由 Jenkins 做。两边会同时存在，是因为「仓库里的脚本变了」和「到有设备的机器上执行」不在同一处。

`XXXX` 换成自己的分支、标签、任务名和路径。前面几节是按「仓库检查」和「占测试机」来配。最后一节是两套工具本身的差别，不依赖某一次台架怎么拆。Jenkins 的安装、邮件和压缩包透传见另外三篇素材。

## 配置写在哪

GitLab CI 的配置是仓库根目录的 `.gitlab-ci.yml`，跟脚本一起评审、一起打标签。执行器是 GitLab Runner，用 `tags` 挑选机器。

Jenkins 的配置拆在三处：任务页面、仓库里的 `Jenkinsfile`、系统配置。节点、密钥、SMTP、谁允许复制制品，都不在 Git 仓库里。`Jenkinsfile` 只描述派到哪个标签、跑什么命令。

所以同一条流水线要改两套东西。只改 yml，测试机不会动。只改 Jenkinsfile，合并请求页面上看不到这次检查。

## 触发

GitLab CI 按仓库事件触发。合并请求、目标分支、哪些路径变了，写在 `rules` 里。

```yaml
check:
  stage: check
  tags: [XXXX]
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "XXXX"
      changes: [XXXX]
  script:
    - python -m pytest XXXX --junitxml=report.xml
```

这适合不占用测试机的检查：脚本能否收集、单元测试、打包前的静态检查。Runner 上没有被测设备时，不要把整机用例写进这个 job。

Jenkins 的触发在任务上，不在合并请求里。常见是三种：定时、上游 `build job`、轮询仓库。定时直接占 Agent。上游把构建号传下来，下游才去复制压缩包。轮询只能发现分支上的新提交，不会在合并请求旁边亮一个绿灯。

## 执行机器

GitLab Runner 的标签和 Jenkins 节点的标签是两套登记。两边都写 `XXXX`，也不会把任务送到同一台机器。

要在 GitLab 上跑测试机里的用例，得在那台机器上单独注册一个 Runner，`tags` 设成 `XXXX`，executor 用 shell。这个 Runner 和 Jenkins Agent 会抢同一块设备。一台测试机只交给一边长期占用，另一边不要再登记成可执行整机用例的机器。

Jenkins Agent 由测试机主动连 Controller，掉线后当前构建结束且不会续跑。GitLab Runner 掉线时，这条 pipeline 停在 pending，Runner 恢复后通常会继续领这个 job。两边对「机器重启了」的结果不一样，不能按同一种方式去点重试。

## 密钥

GitLab 的令牌、机器地址放在项目的 CI/CD Variables。可以标成 Masked。`.gitlab-ci.yml` 里用 `$XXXX` 引用。

Jenkins 的令牌放在 Credentials，SMTP 放在系统配置的 Extended E-mail Notification。Jenkinsfile 里只写 Credentials ID `XXXX`，不写令牌本身。

一边配好的变量，另一边读不到。从 GitLab 改去 Jenkins 时，变量要在 Jenkins 里重建，不是把 yml 复制过去。

## 报告和制品

GitLab 用 `artifacts: reports: junit` 把 `report.xml` 挂到这条 pipeline 上。文件默认会过期，过期时间写成 `expire_in: XXXX`。过期之后合并请求里的报告还在页面上，压缩包本身可能已经没了。

```yaml
artifacts:
  reports:
    junit: report.xml
  paths: [XXXX.zip]
  expire_in: XXXX
```

Jenkins 用 `junit` 步骤做趋势图，用 `archiveArtifacts` 留压缩包，用 `emailext` 发邮件。制品留不留，看任务的丢弃策略，不看 yml 里的 `expire_in`。下游要拿上游的包，还得在上游打开 Permission to Copy Artifact，并传递构建号。GitLab 的 artifact 不会自动出现在 Jenkins 的 `copyArtifacts` 里。

邮件只在 Jenkins 发。GitLab 的 pipeline 失败信是另一套通知，收件人在项目的通知设置里，不会读 Jenkins 的「通过 / 失败两个收件人参数」。

## 不要配重的地方

- 整机用例、占着设备的定时、上下游安装包，配在 Jenkins。
- 合并请求要不要亮灯、哪些路径一变就检查，配在 GitLab CI。
- 测试机只在一边注册成执行器。另一边最多做仓库检查。
- 密钥各存各的。yml 和 Jenkinsfile 里都不写明文。
- 看一次结果要看两个地方：合并请求上看 GitLab 的检查，测试报告和邮件上看 Jenkins 的构建。一边绿了，不能当成另一边已经在设备上跑过。

## 工具本身的差别

上面是用法。两套工具即使拿去做同一件事，配置模型也不一样。

**流水线是不是仓库的一部分。** GitLab CI 的一次执行就是某次提交上的 `.gitlab-ci.yml`。没提交的修改不会出现在合并请求的 pipeline 里。Jenkins 的任务可以指向仓库里的 Jenkinsfile，也可以把脚本贴在任务页面上。贴在页面上的那一份，仓库回滚也回不到。

**一次运行绑定什么。** GitLab 的一条 pipeline 属于一次提交或一个合并请求，阶段图挂在这个对象上。Jenkins 的一次构建属于某个任务的第 N 次，和合并请求没有原生绑定。要在合并请求旁边看见 Jenkins 的结果，得另加状态回报。

**机器怎么领任务。** GitLab Runner 向 GitLab 领取带匹配 `tags` 的 job。没有 Runner 时，job 停在 pending，等到有人来领，或等到超时。Jenkins 由 Controller 把构建派给已经连上来的 Agent。Agent 在构建途中断开，这一次构建结束，不会自动再排队成同一次。

**下一阶段怎么拿文件。** GitLab 同一条 pipeline 里，后一个 stage 用 `dependencies` 或 `needs` 取前一个 job 的 artifacts，这是自带的。Jenkins 跨任务拿文件要靠 Copy Artifact 这类插件，还要构建号和复制权限。同一条 Jenkins 流水线的 stage 之间则用 `stash`，出了这条流水线就丢。

**报告停在哪。** GitLab 把 JUnit 吃进这条 pipeline 和合并请求。Jenkins 把 JUnit 做成这个任务跨构建的趋势图。一个看「这次提交过没过」，一个看「这个任务最近几十次的曲线」。

**密钥和系统设置谁管。** GitLab 的变量可以设在项目、组或实例上，受保护和屏蔽只影响这个范围。Jenkins 的 Credentials、节点、插件和 SMTP 属于 Controller。换一台 Controller，这些都要重建；只把 Jenkinsfile 拷走不够。

**定时的含义。** GitLab 的 Pipeline Schedule 仍是一次提交上的 pipeline，跑在某个 Runner 上。Jenkins 的定时是这个任务再构建一次，跑在它的 Agent 上。定时本身不把两边的机器连起来。
