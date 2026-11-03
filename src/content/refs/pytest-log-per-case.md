---
title: Pytest 里日志按用例切开的几个难点
date: "2026-11-03"
tags: [pytest, 日志]
category: 测试框架
summary: 同一条 logger 上每条用例加一个文件句柄，跑完必须关掉并摘掉。总日志和用例日志分开，控制台不要再开一套 Pytest 自带输出。
draft: false
---

日志要能回答两件事：这次运行整体发生了什么，以及某一条用例自己写了什么。总日志一个文件就够。用例日志必须按条切开，否则失败时只能在一份长文件里翻。下面的 `XXXX` 换成自己的目录名和 logger 名。

## 总日志和用例日志不要写成同一个文件

总日志在 `pytest_sessionstart` 里打开，路径放在 `config` 上，供后面的夹具使用。用例日志在 function 夹具里打开，一条用例一个文件。序号放在 `session` 上递增。参数化用例的名字会重复，只靠函数名会互相覆盖。

文件名从 `nodeid` 来，先去掉 `::` 后面不适合做文件名的字符，再截断。Windows 上 `[]`、`:`、`*` 都不能出现在路径里。

```python
@pytest.fixture
def case_log(request):
    logger = logging.getLogger("XXXX")
    folder = getattr(request.config, "_case_dir", None)
    handler = None
    if folder:
        request.session._seq = getattr(request.session, "_seq", 0) + 1
        name = request.node.nodeid.rsplit("::", 1)[-1]
        name = re.sub(r"[^\w\-]+", "_", name)[:80] or "case"
        path = os.path.join(folder, f"{request.session._seq:02d}_{name}.log")
        handler = logging.FileHandler(path, encoding="utf-8")
        logger.addHandler(handler)
    yield logger
    if handler:
        handler.close()
        logger.removeHandler(handler)
```

`getLogger("XXXX")` 在整个进程里是同一个对象。每条用例 `addHandler` 一次，不在 `yield` 后面 `removeHandler`，下一条用例会把同一行写进前面所有还开着的文件。跑到第 N 条时，第一条的文件里会有 N 份重复。句柄不 `close`，Windows 上这个文件会一直被占用，会话结束时目录删不掉。

用例在夹具建立阶段就失败时，可能还没有这条用例的文件。总日志里要能看到这次失败，不能只靠用例文件。

## 传播会让一行打两遍

`Logger` 默认 `propagate = True`。用例文件句柄挂在 `"XXXX"` 上，根 logger 上如果还有一个总日志句柄，同一条记录会先写用例文件，再冒泡到根 logger 写总日志。这是想要的。

不想要的是根 logger 和 `"XXXX"` 上各挂一个往控制台写的 `StreamHandler`。一行会在终端出现两次。自己已经配置了控制台输出，就不要再开 Pytest 的 `--log-cli-level`。那套会再挂一套 handler，和现有的叠在一起。

文件用 `encoding="utf-8"`。控制台在中文 Windows 上常常是 GBK，日志里有终端码页写不出的字符时，`StreamHandler` 会在打印时抛错，用例变成 ERROR，文件里的内容其实是完整的。控制台这条 handler 要用能替换无法编码字符的写法，不要让打印失败反过来弄失败用例。

## 级别和格式只设一处

logger 自己的级别是总闸，handler 的级别是这一路输出的闸。logger 设成 WARNING，再把文件 handler 设成 DEBUG，文件里仍然没有 DEBUG。总日志要全，logger 设 DEBUG，控制台 handler 设 INFO，文件 handler 设 DEBUG。

格式化也按路分。文件里留时间、级别、用例名。控制台可以短一些。不要在 logger 上设一个格式再指望某个 handler 换成另一种，格式是 handler 的 `Formatter`。

## 和 Pytest 捕获的关系

`caplog` 只能看到会传播到它挂载点的 `logging` 记录。日志如果写进了另一个不传播的 logger，或者直接写文件、不经过 `logging`，`caplog.text` 是空的。断言日志内容时，要么让这条 logger 能被 `caplog` 看见，要么读刚刚写好的那个用例文件。不要两套各看各的，结果互相为空。

夹具失败记成 ERROR 时，`yield` 后面的摘除仍然要跑到。摘除写在 `yield` 之后，并且先判断 `handler` 是不是已经创建。建立阶段就失败时，没有 handler，不能再 `close` 一次。

持续集成只归档总日志时，单条失败的上下文会混在一起。把用例目录一并收进构建产物，文件名里的序号和用例名要能对上报告里的那一条。
