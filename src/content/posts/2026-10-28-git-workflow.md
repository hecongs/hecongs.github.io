---
title: 测试脚本仓库的 Git 流程
date: "2026-10-28"
updated: "2026-10-30"
tags: [Git, 测试脚本, Jenkins]
summary: 测试脚本仓库的日常线：看状态、拉取、开分支、处理冲突再推回去。Jenkins 跑的是仓库里的版本，不是测试机上还没提交的文件。
draft: false
---

我管的是测试脚本，不是产品固件。达发和涂鸦的脚本走 Git，态坦的机台软件和 Pattern 还会碰到 SVN。脚本仓库每天就这一条线：先看本地有没有改动，再把远程更新拉下来，需要旧版本就切过去，要改脚本就开新分支，改完提交，把主分支合并进来，有冲突就处理掉，最后再推回去。Jenkins 跑的是仓库里的版本，不是测试机上还没提交的文件。

## 每天开始：看状态，再拉取

```bash
git status
git fetch origin
git switch main
git pull --ff-only
```

`status` 看有没有未提交的修改。它分成还没暂存的修改、已经暂存即将提交的修改、以及 Git 还不认识的未跟踪文件。短格式 `git status -sb` 的第一行如果写着 `ahead 1`，表示本地多 1 个提交还没推；`behind 2` 表示远程多 2 个提交，该拉取了。

`fetch` 只把远程的新提交下载到本地，不改你正在写的文件。`pull --ff-only` 等于先下载，再要求本地分支能快进到远程。能快进，指针就向前移。两边各有新提交，命令失败并停住，不会悄悄生成一笔合并提交。测试仓库用这个限制。快进失败时，先看清两边的提交，再手动合并。

工作区不干净时不要拉取。先提交，或先收进抽屉：

```bash
git stash push -u -m "还没写完的断言"
git pull --ff-only
git stash pop
```

`-u` 把未跟踪文件也放进抽屉。`stash pop` 之后如果冲突，按后面的冲突办法处理。这些改动弹回来之后仍然没有提交。

只想看远程最新是哪一笔、先不合并时，`fetch` 就够：

```bash
git fetch origin
git log -1 --oneline origin/main
```

最近几笔提交：

```bash
git log -8 --oneline
git show --stat HEAD
```

`HEAD` 是当前分支最前面的那一笔，`HEAD~1` 是它的上一笔。

## 切换分支和版本

分支还会往前走，标签钉住某次已经确认过的脚本，提交号指向任意一笔历史。

```bash
git branch
git branch -a
git tag
git fetch origin
git switch 远程已有的分支名
```

`-a` 包括 `origin/` 开头的远程分支。从最新主分支开自己的分支，不要直接在主分支上改：

```bash
git switch main
git pull --ff-only
git switch -c test/dhcp-lease
```

分支名写测试点，例如 `test/hidden-reconnect`、`test/slt-pattern-load`。不要用 `tmp`、`test1`。

临时看某个旧版本，给 Jenkins 复现或本地对一下：

```bash
git fetch origin --tags
git switch --detach v1.2.0
```

这是分离头指针。`git status` 会写 `HEAD detached at v1.2.0`。看完必须回到分支：

```bash
git switch main
```

在分离头指针上改出来的提交，一切分支就找不回来。要在旧版本上改，从标签开分支：

```bash
git switch -c test/fix-v1.2.0 v1.2.0
```

某一笔提交同样处理，把标签换成提交号，例如 `git switch --detach 5d37eaa`。

工作区有改动、而且那个文件在目标版本上也不一样，切换会被拒绝。先提交或 stash。不要用 `git reset --hard` 来换版本，它会丢掉当前分支上还没推送的提交和工作区修改。

## 提交

提交前看差异，只加入这一次的文件：

```bash
git status
git diff
git add test_case/disconnect/test_disconnect_01_clears_connection.py
git diff --staged
git commit -m "断开用例只检查链路已断开，不再等待 DHCP"
```

`git diff` 看还没暂存的内容，`git diff --staged` 看即将进入提交的内容。`git add .` 会把日志、报告、`.env` 一起加进去，测试仓库里不要用。一个文件里有两件不相关的改动时，用 `git add -p 文件` 按块选择。

提交说明写原因。别人看日志要能知道这笔提交在防止什么误判。不要写「更新代码」或「fix」。

提交之后确认：

```bash
git status
git log -1
```

工作区应是干净的。说明写错了、而且这笔还没推送，可以用 `git commit --amend` 改说明。已经推送的提交不要 amend，另开一笔新提交。

这些不要进仓库：`.env`、账号、路由器管理密码、Jenkins agent secret、`logs/`、`report.html`、`report.xml`、抓包、驱动包。态坦的 Pattern 程式跟着机台软件走，不要和「改了一条断言」打在同一个提交里，否则回滚脚本时会把不该动的测试向量一起退回去。仓库里可以放没有密码的 `.env.example`。

## 合并

先把主分支的新提交合并进你的分支，测通之后再合回主分支。冲突就会出在你的分支上。

```bash
git switch test/dhcp-lease
git fetch origin
git log --oneline HEAD..origin/main
git diff --stat HEAD...origin/main
git merge origin/main
```

合并前那两行分别是对方有而你没有的提交，以及文件级别的差异。确认里面没有别人的半成品再合并。

允许直接合并主分支时：

```bash
git switch main
git pull --ff-only
git merge test/dhcp-lease
git push origin main
git branch -d test/dhcp-lease
```

`-d` 只删除已经合并过的分支。团队要求评审时，不要在本地把功能分支合并进主分支，只推功能分支，在 GitLab 上开合并请求：

```bash
git push -u origin test/dhcp-lease
```

`git rebase` 会改写你这几个提交的编号。已经推送并给别人用过的分支不要 rebase。测试仓库日常用 merge。

合并不会跑测试。合进主分支之前，在你的分支上把受影响的用例跑一次。Jenkins 若拉主分支做定时回归，合进去的脚本就是下一次要执行的版本。

## 冲突

同一处两边都改了，Git 会把文件标成 `both modified`。打开后是这样：

```text
<<<<<<< HEAD
assert not link_up
=======
assert ip.startswith("192.168.124.")
>>>>>>> origin/main
```

`<<<<<<<` 到 `=======` 是当前分支，`=======` 到 `>>>>>>>` 是合进来的那一边。看清各自在防什么，删掉这三行标记，只留下要的代码。两件都要时写成两句独立检查，不要把两段原文粘在一起。超时时间不要取平均值，按这个用例的判定留一个。`.env.example` 两边各加的键都留下，不要留下密码。

然后：

```bash
git diff
git add path/to/test_disconnect.py
git commit
```

再搜一遍 `<<<<<<<`，确认没有残留。方向选错、还没开始解决时，用 `git merge --abort` 回到合并之前。`stash pop` 造成的冲突不是 merge，不能用这条。

## 推送

没有提交的修改不会被推上去。Jenkins 从远程拉取时，你没推送，流水线就还是旧脚本。

```bash
git push -u origin test/dhcp-lease
git status -sb
git log origin/main..HEAD --oneline
```

第二行是即将比远程主分支多出去的提交，里面应只有这一次的测试改动。

推送被拒绝、提示 `non-fast-forward`，表示远程有你本地没有的提交。不要加 `--force`。先 `git fetch`，再 `git merge origin/main`，处理完再推。主分支不要强制推送。

## 用标签固定版本

分支会继续向前，标签不会。某次已经跑通、要交给 Jenkins 按原样再跑的脚本，打标签：

```bash
git status
git log -1 --oneline
git tag -a v1.2.0 -m "SLT Pattern 回归脚本，对应该季度机台软件"
git push origin v1.2.0
```

标签打在提交上。没提交的修改不会进标签。取出这个版本用 `git switch --detach v1.2.0`，看完 `git switch main`。标签打错而且已经推送，不要删了重打到另一笔提交上，另打 `v1.2.1`。

主分支给日常回归，功能分支给你还在改的那一件事，标签给已经确认过的版本。复现某次失败时，把标签或提交号写进 Jenkins 参数。切到旧版本只说明脚本回到了那一笔。Pattern、固件、路由器配置如果没一起记录，现象不一定能复现。
