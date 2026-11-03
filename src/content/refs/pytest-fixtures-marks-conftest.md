---
title: Pytest 的夹具、标记和 conftest
date: "2026-11-03"
tags: [pytest, 夹具, conftest]
category: 测试框架
summary: session 放整次运行只建一次的资源，function 放每条用例自己的对象。标记写进 pytest.ini，用 -m 选择。前置在 yield 之前，后置在 yield 之后，失败也会执行。
draft: false
---

Pytest 先读配置并注册参数，再收集用例，然后按依赖把夹具准备好，跑断言，再按相反顺序拆掉。常用的就是这三样：夹具管共享资源，标记决定这次跑哪一批，`conftest.py` 把前置和后置从用例里拿出去。下面的 `XXXX` 是占位，换成自己的目录名、标记名和参数名。

默认收集 `test_*.py`、`*_test.py` 里的 `test_` 函数，以及 `Test` 开头的类里的 `test_` 方法。文件名规则写在 `pytest.ini` 的 `python_files`。

## 夹具管什么、活多久

夹具是一个函数，用例把它的名字写进参数，Pytest 负责调用并注入返回值。范围由 `scope` 决定，一次进程里建几次：

| scope | 何时建立 | 适合放 |
|---|---|---|
| session | 整次 pytest 一次 | 只建一次的连接或配置 |
| module | 每个测试文件一次 | 这一组用例共享的对象 |
| function | 每条用例一次 | 独立日志、必须还原的状态 |

依赖按名字传递。`case_log` 要用连接，就写 `def case_log(conn)`，不用在用例里再取一次。

`--name` 要先在 `pytest_addoption` 里注册，否则 `getoption` 会报没有这个参数。注册写在后面的 conftest 一节。

```python
@pytest.fixture(scope="session")
def conn(request):
    name = request.config.getoption("--name")
    handle = open_resource(name)
    yield handle
    handle.close()

@pytest.fixture
def case_log(conn):
    log = make_log(conn)
    yield log
    log.close()

def test_xxxx(conn, case_log):
    case_log.info(conn.name)
    assert conn.ready
```

`yield` 上面是前置，下面是后置。用例失败、断言中断，后置仍然执行。只 `return` 的夹具没有后置，资源会留到进程结束。

`autouse=True` 的夹具不用写进参数也会跑。不写 `scope` 时是 function，每条用例前后都清一次。要「这一组文件开始前清一次」，把 `scope` 写成 `module`。不要把业务断言写进 autouse，失败原因会变成夹具错误，看不出是哪条用例。

```python
@pytest.fixture(autouse=True)
def clean_residue():
    remove_stale("XXXX")
    yield
    remove_stale("XXXX")
```

范围不要放大。会改状态的步骤用 function。只读一次的配置用 session。session 夹具里如果把共享资源关掉，后面的用例都拿不到它。

## 标记决定这次跑哪些

标记写在用例上，并在 `pytest.ini` 里登记。不登记时，Pytest 只给警告。加上 `--strict-markers` 之后，没登记或拼错的标记会让这次运行直接失败。

```ini
[pytest]
testpaths = XXXX
addopts = -v --tb=short --strict-markers --junitxml=report.xml
markers =
    smoke: 短路径
    slow: 时间长，默认可以排除
    nightly: 只在定时任务里跑
```

```python
@pytest.mark.smoke
def test_xxxx(conn):
    assert conn.ready
```

选择用 `-m`，布尔关系是 `and`、`or`、`not`：

```bash
pytest -m smoke
pytest -m "smoke and not slow"
pytest -m "not nightly"
```

`skip` 是这条不跑。`skipif` 带条件。`xfail` 是已知会失败、仍然执行。结果如预期失败，记成 XFAIL，这次运行不算失败。问题修掉以后它变成 XPASS。默认的 XPASS 也不会把运行打红，所以标记会留在用例上没人注意。要让意外通过变成失败，写成 `@pytest.mark.xfail(strict=True)`，或在配置里设 `xfail_strict = true`。

收集阶段只决定有哪些用例，不要在这里改外部状态。需要根据运行时条件再 `skip` 或 `xfail` 时，放到 `pytest_runtest_setup`，那时这条用例真的要跑了。

## conftest 把前置和后置从用例里拿走

`conftest.py` 不用导入。Pytest 从用例所在目录向上找，父目录的夹具子目录能用，子目录的夹具父目录看不到。

根上的 `conftest.py` 放整次运行都要的东西：命令行参数、session 级资源、报告路径。某个子目录自己的 `conftest.py` 只放这一组用例的前置，例如这组要先准备数据、跑完再清掉。

```text
XXXX/
  conftest.py
  pytest.ini
  tests/
    group/conftest.py
    group/test_xxxx.py
```

命令行参数在 `pytest_addoption` 里注册，夹具用 `request.config.getoption` 读取。密钥不要写进用例。

```python
def pytest_addoption(parser):
    parser.addoption("--name", action="store", default=None)

@pytest.fixture(scope="session")
def conn(request):
    name = request.config.getoption("--name")
    if not name:
        pytest.skip("未指定 --name")
    handle = open_resource(name)
    yield handle
    handle.close()
```

一组用例的前置放在该目录的 module 夹具里。`yield` 之后恢复现场，避免下一个文件还停在被改过的状态上。

```python
@pytest.fixture(scope="module", autouse=True)
def prepare_xxxx():
    apply_state("XXXX")
    yield
    restore_state("XXXX")
```

钩子和夹具分工：夹具给用例提供对象；钩子改 Pytest 自己的流程。`pytest_sessionstart` 做整次开始时的目录，`pytest_sessionfinish` 收报告。`pytest_runtest_setup` 在单条用例开始前决定 skip 或 xfail。

## 一次运行的顺序

1. 读 `pytest.ini`，加载根目录的 `conftest.py`。`pytest_addoption` 在这一步注册参数，必须写在启动时就会加载的 conftest 里。子目录的 conftest 要等收集到那个目录才加载，来不及再加命令行参数。
2. 解析命令行，按 `testpaths` 和 `-m` 收集用例。收集只决定跑哪些，不建立夹具。
3. 跑到第一条用到某个夹具的用例时才建立它。session 整次最多一次，module 每个测试文件一次，function 每条用例一次。没有任何用例用到的夹具不会执行。autouse 视为被用到。
4. 单条用例的建立顺序是 session、module、function，然后跑断言。
5. 这条用例的 function 后置马上执行。这个文件的用例都跑完，才做 module 后置。整个进程结束，才做 session 后置。

报告可以用 `--junitxml=report.xml` 交给持续集成。夹具建立失败记成 ERROR，用例断言失败记成 FAILED。后置写在 `yield` 下面，用例已经失败时后置仍会执行。
