---
title: 直连、静态路由、OSPF 和 BGP

date: "2026-11-03"
series: switch-nos
order: 8
tags: [交换机, OSPF, BGP]
summary: 没有更具体的路由时走默认路由。OSPF 在一个网络里交换拓扑，BGP 在网络之间交换前缀。邻居起来而前缀没进内核路由表，业务仍然不通。
draft: false
---

端口配上 IP 和掩码之后，这个网段成为直连路由。报文要去的地址不在任何一条路由里，设备不会转发，哪怕链路灯是亮的。这和地址落到错误网段是同一类失败：二层通了，三层没有下一跳。

静态路由是人写的一条「去这个网段，交给哪个下一跳」。通过要两行一起看：路由表里有这条，并且从源侧 ping 通目的。只有表、没有 ping，下一跳可能不可达。只有 ping、表里没有，包可能是从别的路径走的。

默认路由是最后一条：更具体的前缀都没配上时，交给这个下一跳。下面 a 和 c 不在同一网段，中间的 b 负责转发。

```bash
ip netns add a
ip netns add b
ip netns add c
ip link add ab type veth peer name ba
ip link add bc type veth peer name cb
ip link set ab netns a
ip link set ba netns b
ip link set bc netns b
ip link set cb netns c

ip netns exec a ip addr add 10.0.1.1/24 dev ab
ip netns exec b ip addr add 10.0.1.2/24 dev ba
ip netns exec b ip addr add 10.0.2.2/24 dev bc
ip netns exec c ip addr add 10.0.2.1/24 dev cb
ip netns exec a ip link set ab up
ip netns exec b ip link set ba up
ip netns exec b ip link set bc up
ip netns exec c ip link set cb up
ip netns exec b sysctl -w net.ipv4.ip_forward=1
```

这时 a 还没有去 `10.0.2.0/24` 的路由，ping 会报网络不可达。加上默认路由再看表：

```bash
ip netns exec a ip route add default via 10.0.1.2
ip netns exec c ip route add default via 10.0.2.2
ip netns exec a ip route
ip netns exec a ping -c 1 10.0.2.1
```

`ip route` 里除了直连的 `10.0.1.0/24`，还有 `default via 10.0.1.2`。b 自己有两边的直连路由，所以不用默认路由。更具体的前缀优先：若再加一条 `ip route add 10.0.2.0/24 via 某个地址`，去 `10.0.2.1` 会走这一条，不再走 default。

下一跳必须是当前已经能到达的地址。`via 10.0.1.2` 落在 a 的直连网段里，才找得到 ARP。写成一个 a 没有路由能到达的地址，这行可以出现在表里，包仍然出不去。

```bash
ip netns del a
ip netns del b
ip netns del c
```

## OSPF 交换拓扑，BGP 交换前缀

两种协议先各做一个邻居、一条前缀，不做多区域和路由反射。

OSPF 用在同一个网络里面。每台路由器把自己的链路告诉邻居，大家算出同一张图，再各自算最短路径。邻居要到 Full，才表示这张图同步完了。停在 Init、ExStart，是 hello 或 MTU 没对上，路由不会完整。对端网段应出现在路由表里，来源标成 OSPF。

BGP 用在网络和网络之间。一台把前缀连同经过的路径交给对端，对端再决定用不用。邻居要到 Established。在这之前的 Active、Idle 表示还在连或已经放弃。发出去的前缀，对端要能看到，并且被选成最佳路由，装进内核的转发表。邻居 Established 但前缀被策略丢掉，会话是好的，业务不通。

家用交换机常常没有这两个协议。用 FRRouting，在对应的网络名字空间里启动之后再看。协议表和内核表分开读：

```bash
ip netns exec r1 vtysh -c 'show ip ospf neighbor'
ip netns exec r1 vtysh -c 'show ip route'
ip netns exec r1 ip route
```

BGP 把第一条换成 `show bgp summary`。`vtysh` 里有这条前缀、`ip route` 里没有，就是算出来了但没有装进转发。两边都有，再从源侧 ping 目的。

OSPF 最小配置只留本端 router-id、互联网段和要通告的一条网段，区域用 0。BGP 最小配置只留本端 AS、对端地址和对端 AS，以及一条 `network`。`network` 写出去的前缀必须已经在本机路由表里，例如一个 dummy 接口上的地址。否则邻居能到 Established，前缀却发不出去。
