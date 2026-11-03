---
title: 帧和 IP 包各看什么
date: "2026-11-03"
series: switch-nos
order: 3
tags: [交换机, 以太网, IP]
summary: 一次 ping 里同时有 MAC 和 IP。交换机按目的 MAC 选口，路由器按目的 IP 选下一跳。
draft: false
---

线上的一次转发里有两层地址。外层是以太网帧，上面写着源 MAC 和目的 MAC，有 VLAN 时还带着 tag。帧里面是 IP 包，上面写着源 IP 和目的 IP。交换机选从哪个口出去，看的是目的 MAC 和 VLAN。路由器选下一跳，看的是目的 IP。

用一对虚拟网卡把这两层同时看出来。需要 root，以及 `tcpdump`。

```bash
ip netns add h1
ip netns add h2
ip link add v1 type veth peer name v2
ip link set v1 netns h1
ip link set v2 netns h2
ip netns exec h1 ip addr add 192.168.10.1/24 dev v1
ip netns exec h2 ip addr add 192.168.10.2/24 dev v2
ip netns exec h1 ip link set v1 up
ip netns exec h2 ip link set v2 up

ip netns exec h2 tcpdump -ni v2 -e -c 1 icmp &
sleep 1
ip netns exec h1 ping -c 1 192.168.10.2
```

`-e` 会把 MAC 打在同一行的前面。一行里先看到两个 MAC，然后是 `192.168.10.1 > 192.168.10.2`。前面是帧，后面是包。

交换机不改这一行的 IP，也不改 TTL。它只根据目的 MAC 决定从哪个口把这一帧送出去。目的 MAC 已经学到，就只出那一个口。没学到，就向同 VLAN 的其他口洪泛。

路由器要改这外层。它按目的 IP 查出下一跳，从出接口发出去时，目的 MAC 换成下一跳的 MAC，源 MAC 换成自己出接口的 MAC，TTL 减一。所以同一条 ping 在路由器两侧抓到的 MAC 不是同一对。这个现象留在 VLAN 之间的三层转发里看。

做完后删掉名字空间：

```bash
ip netns del h1
ip netns del h2
```
