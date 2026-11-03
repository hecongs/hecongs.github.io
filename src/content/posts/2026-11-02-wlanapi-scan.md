---
title: Dongle 扫描和连接走 wlanapi
date: "2026-11-02"
tags: [Wi-Fi, wlanapi, Dongle]
summary: USB Wi-Fi Dongle 的扫描和连接不在脚本里组 802.11 帧。用例核对的是驱动经 wlanapi 交回来的结构，信道再从 netsh 文本补上。
draft: false
---

Windows 上的 USB Wi-Fi Dongle，扫描和连接都不在测试脚本里组 802.11 帧。用例调用 `wlanapi.dll`，由系统的 WLAN 服务把请求交给这块网卡的驱动，再把驱动填好的结构交回来。脚本要核对的是这份结构，不是自己拼出来的报文。

调用停在 `utils/wlan_scan_helper.py` 的 `WlanScanner`。它用 ctypes 加载 `wlanapi.dll`，`WlanOpenHandle` 的客户端版本是 2，用完 `WlanCloseHandle`。网卡先用 `WlanEnumInterfaces` 枚举，按接口名找到 GUID，后面的扫描和连接都带这个 GUID。

## 扫描先触发，再读两份列表

`WlanScan` 的返回只说明扫描已经发出。驱动还在收 beacon 的时候，接口就可以返回。所以触发之后先等 `SCAN_WAIT` 秒，默认 4 秒，再读结果。

读两份，粒度不同：

- `WlanGetAvailableNetworkList` 是按网络。一条里有 SSID、已保存的 profile 名、认证、加密、信号质量和这个 SSID 下面有几个 BSSID。
- `WlanGetNetworkBssList` 是按 AP。SSID 参数传空，BSS 类型用 any，安全过滤关掉，把开放网络也算进去。一条里有 BSSID、RSSI、链路质量和 beacon 周期。

`wlanapi` 打不开或调用失败时，整次扫描退回解析 `netsh wlan show networks mode=bssid` 的文本。调用成功时也还会读一遍这份文本，但只用来补信道。

## 列表是头加柔性数组

这两份列表在 C 里都是「固定头，后面紧跟若干条目」。头里的 `dwNumberOfItems` 告诉你有几条。ctypes 的 `Structure` 不会把柔性数组成员展开成 Python 列表，结构体里如果写上占位的那一条，`sizeof` 会把头和第一条算在一起，后面的地址全部错一位。

所以结构体只声明头。第 `i` 条的地址是：缓冲起始，加上头的长度，再加上 `i` 乘以单条的长度。

```python
head = ctypes.cast(bss_mem, ctypes.POINTER(WLAN_BSS_LIST)).contents
base_offset = ctypes.sizeof(WLAN_BSS_LIST)
item_size = ctypes.sizeof(WLAN_BSS_ENTRY)
for idx in range(int(head.dwNumberOfItems)):
    bss_ptr = ctypes.cast(
        bss_mem.value + base_offset + idx * item_size,
        ctypes.POINTER(WLAN_BSS_ENTRY),
    )
```

接口列表和可用网络列表用的是同一种算法，换的是头和条目的类型。`WlanGetNetworkBssList`、`WlanGetAvailableNetworkList`、`WlanEnumInterfaces` 交出来的缓冲都在 `finally` 里交给 `WlanFreeMemory`。这三份内存是 API 分配的，不配对释放，多次扫描会把测试机的句柄和地址空间慢慢吃掉。

SSID 放在 `DOT11_SSID` 里：一个长度，加 32 字节。长度是 0 就记成隐藏网络。字节先按 UTF-8 解，解不开再用 Latin-1。SSID 不保证是合法 UTF-8，直接 `decode()` 会让整次扫描在一条坏名字上停住。

这份 `WLAN_BSS_ENTRY` 没有读中心频率，条目里的信道先空着。RSSI、BSSID、beacon 周期都在这条目前面的固定字段里，不依赖后面的 IE。信道从 `netsh` 的 BSSID 模式文本解析出来，按 BSSID 合并进已经拿到的条目。同一条 AP，信号和地址以 `wlanapi` 的二进制结构为准，信道以 `netsh` 那一列为准。

## 连接用 profile，返回不等于连上

连接走 `WlanConnect`，用的是 Windows 里已经导入的 WLAN profile，名字通常就是 SSID。连接模式是 profile（值 0），BSS 类型是 infrastructure（值 1）。要固定到某一台路由器时，把 6 字节 MAC 放进 `pDesiredBssidList`，只放一条。

`WlanConnect` 返回成功，只说明 WLAN 服务接受了这次请求。网卡有没有关联上、地址有没有落在这台路由器的网段里，是用例在这之后单独查的。关联成功仍然不算连上。断开用例只看链路已经断，不再空等 DHCP。这些判定在扫描函数外面，但这边的接口如果把「请求已提交」写成「已经连上」，后面的判定就没有机会执行。
