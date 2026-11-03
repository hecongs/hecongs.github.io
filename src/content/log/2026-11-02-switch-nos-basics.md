---
title: 交换机操作系统要补的转发和判定

date: "2026-11-02"
series: switch-nos
order: 1
tags: [交换机, VLAN, 路由]
summary: 从 Linux 网桥把 VLAN、路由和 ACL 做出来，每条都用计数器证明该通的在涨、不该通的不动。
draft: false
---

Wi-Fi Dongle 台架已经在用两样东西做判断：链路状态，以及流量有没有真的过去。关联成功不算连上，地址要落在当前网段，iperf 用来证明有流量。交换机操作系统要补的是另一层：报文进了哪一个端口、被哪一张表送出去。命令配置成功，只说明控制面接受了；端口计数器变了，才说明转发面按这张表走了。

下面每一步都写成能在一台 Linux 上做完的实验。家用可管理交换机有的话，VLAN 和聚合用真机再做一遍，现象和网桥相同。RoCE、SRv6、集合通信各自有单独的笔记，放在这五步能对着计数器讲清楚之后再读。

## 控制面和转发面

交换机里 CPU 上跑的系统负责启动、端口 up/down、配置和路由协议。交换芯片按表转发：MAC 表、VLAN 表、路由表、ACL。

测试时两张证据都要留。`show` 出来的邻居和路由是控制面。入端口计数增加、出端口计数增加、不该出去的端口计数不动，是转发面。只看命令回显，会把「配置写进去了」当成「流量走对了」。

## 二层：MAC、VLAN、聚合

两个主机接在同一台交换机上，先不配 IP 之外的任何东西。主机 A ping 主机 B，交换机会把 A 的 MAC 学在 A 所在的端口上。之后发给 A 的帧只从那个端口出去，不再洪泛。

用网桥看这张表：

```bash
ip netns add h1
ip netns add h2
ip link add br0 type bridge vlan_filtering 1
ip link set br0 up

ip link add v1 type veth peer name v1b
ip link add v2 type veth peer name v2b
ip link set v1 netns h1
ip link set v2 netns h2
ip link set v1b master br0 up
ip link set v2b master br0 up

ip netns exec h1 ip addr add 192.168.10.1/24 dev v1
ip netns exec h1 ip link set v1 up
ip netns exec h2 ip addr add 192.168.10.2/24 dev v2
ip netns exec h2 ip link set v2 up

bridge vlan add dev v1b vid 10 pvid untagged
bridge vlan add dev v2b vid 10 pvid untagged
bridge vlan del dev v1b vid 1
bridge vlan del dev v2b vid 1

ip netns exec h1 ping -c 2 192.168.10.2
bridge fdb show br br0
```

`bridge fdb show` 里要能看到 h1、h2 的 MAC 分别落在 `v1b`、`v2b`。这就是 MAC 学习。

VLAN 是在这条二层上再切广播域。把第三台主机放进 VLAN 20，即使 IP 仍写成 `192.168.10.0/24`，也 ping 不通 VLAN 10 里的主机。同一网段、不同 VLAN，交换机不转发。Access 口只带一个 VLAN，帧上没有 tag。Trunk 口带 tag，一台设备上要跑多个 VLAN 时用它。

链路聚合是把两根线当成一个逻辑口。断掉其中一根，MAC 仍从剩下的成员出去，流量还在。两根都断，逻辑口 down。Linux 上对应 `bonding`，家用交换机上做一次成员口热拔插更直观：拔一根之前和之后各看一次对端计数，计数还在涨才算聚合生效。

生成树只记一件事：两台交换机之间如果有两条线又没有聚合，二层会成环，广播会转圈。生成树会把其中一条逻辑上堵上。实验先不要展开。

## 三层：接口地址、静态路由、OSPF 和 BGP

端口配了 IP，这个网段会成为直连路由。没有路由的网段，报文出不去，和 Wi-Fi 里地址落到错误网段是同一类失败：链路是亮的，三层没走通。

静态路由用于还没上动态协议之前。在一台做路由器的网络名字空间里写一条 `ip route add 10.2.0.0/24 via 10.0.0.2`，然后从一侧 ping 另一侧。路由在表里，并且 ping 通，这两件事一起才算通过。

OSPF 和 BGP 先各做一个邻居，不要做多区域、反射器。

OSPF 看邻居是否到 Full，对端的网段是否出现在路由表里，前缀来源是 OSPF。BGP 看邻居是否 Established，发出去的前缀对端是否收到，并且是 best。邻居起来了但路由没装进转发表，业务仍然不通。协议状态和转发表是两行证据。

家用交换机很多不做 OSPF/BGP。这一步用 FRRouting 放在两台 Linux 上即可，配置只留邻居和一条前缀。

QoS 先分清三步：按什么分类（地址、端口、DSCP）、进哪个队列、队列满了丢谁。实验可以只做一条：给某一类流量打上标记，拥塞时这一类先被丢掉，其余仍在走。没有拥塞时看不出 QoS，所以要先把链路打满。

## ACL

ACL 是转发出去之前的一条过滤。写一条「源地址 `192.168.10.1` 丢弃」，然后：

- 从这台主机发出的包，出端口计数不增加，规则上的命中计数增加。
- 从另一台主机发出的同样目的的包，出端口计数增加，这条规则的命中计数不动。

第二条用来证明丢的是规则，不是链路断了。Linux 上可以用 `nft` 的 `counter` 做同样的观察。交换机上的计数在芯片的 ACL 表里，命令是 `show access-list` 一类，名字随系统变，看的字段是命中次数。

## 设备本身

接触真机时先建立和 Dongle 一样的「设备在不在」检查：

- 串口能登录，提示符是这台设备的系统。
- 端口 up 还是 down，光模块在位时端口才能 up。模块不在，配多少 VLAN 都没有流量。
- 升级镜像之后能起来，版本号和这次要测的镜像一致。重启后配置还在不在，要单独看：有的系统重启丢配置，有的要先保存。

风扇、电源、PDU 是环境。端口 down 先看模块和线，再看配置。环境问题不要写成功能失败。

## 一条用例怎么写通过

每个功能固定两面：

| 动作 | 通过 |
|---|---|
| 应该转发 | 入端口计数增加，正确的出端口计数增加，业务 ping 或 iperf 通 |
| 应该隔离或丢弃 | 出端口计数不动，规则或 VLAN 的计数能解释这个丢弃 |

失败时的顺序也固定：先看端口 up/down 和错误计数，再看 MAC、VLAN、ARP、路由、邻居，最后才怀疑芯片或软件。和 Dongle 上先看关联、再看地址、再看 iperf 是同一个习惯。

iperf 在百兆、千兆上够用来证明有流量。流量仪把同样的收发做到线速，并按一条流统计丢包和时延。没有仪表时，先把流的定义和两侧计数写清楚。

## 先做完的顺序

1. 网桥上完成同一 VLAN 互通、不同 VLAN 隔离，留下 `bridge fdb` 和 `bridge vlan` 的输出。`PVID` 那一行就是不带 tag 的帧进的 VLAN。
2. ping 前后各看一次 `ip neigh`。表是空的，或者 MAC 写错，路由在也不通。
3. 两个 VLAN 各配一个三层接口，主机把默认路由指向它，再 ping。两侧抓包应看到 MAC 换过、TTL 少 1。
4. 静态路由或默认路由两侧互 ping，路由表和 ping 各留一份。
5. ACL 命中计数和「另一台主机不受影响」各留一份。
6. OSPF 或 BGP 只做一个邻居、一条前缀。协议表和内核的 `ip route` 分开看。
7. 有真机再做光模块、端口 up/down、聚合拔线、镜像重启后配置还在不在。

这几步能对着计数器讲清楚，再看性能、长稳和高可用倒换。那些是在转发已经正确之后，看它能撑多久、断一根线会怎样。

每一块的说明单独记在后面这些笔记里。

- [控制面和转发面](/log/2026-11-03-control-and-forwarding/)
- [帧和 IP 包各看什么](/log/2026-11-03-frame-and-packet/)
- [MAC 学习和 VLAN](/log/2026-11-03-mac-vlan/)
- [链路聚合和生成树](/log/2026-11-03-lag/)
- [ARP 把下一跳 IP 变成 MAC](/log/2026-11-03-arp/)
- [VLAN 之间靠三层接口互通](/log/2026-11-03-inter-vlan/)
- [直连、静态路由、OSPF 和 BGP](/log/2026-11-03-routing-ospf-bgp/)
- [ACL 的命中计数](/log/2026-11-03-acl/)
- [QoS 要在拥塞时才看得出来](/log/2026-11-03-qos/)
- [串口、光模块和镜像](/log/2026-11-03-console-optics-image/)
- [用计数器写转发用例的通过](/log/2026-11-03-forwarding-pass-fail/)
- [网络设备操作系统和两种测试床](/log/2026-11-03-nos-and-testbed/)
- [功能、回归、冒烟和每周全量](/log/2026-11-03-test-layers/)
- [功能之外的测试和分位数](/log/2026-11-03-nfr-percentiles/)
- [从 iperf 到流量仪](/log/2026-11-03-traffic-generators/)
- [YANG、NETCONF 和 gNMI](/log/2026-11-03-yang-netconf-gnmi/)
- [硬件床上的串口和电源插座](/log/2026-11-03-labgrid-ports/)
- [无损以太网里的 PFC、ECN 和 RoCE](/log/2026-11-03-lossless-ethernet/)
- [SRv6 在看什么](/log/2026-11-03-srv6/)
- [集合通信在交换网上测什么](/log/2026-11-03-collective-communication/)
