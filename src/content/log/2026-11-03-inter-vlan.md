---
title: VLAN 之间靠三层接口互通
date: "2026-11-03"
series: switch-nos
order: 7
tags: [交换机, VLAN, 路由]
summary: 不同 VLAN 在二层互不转发。要互通，主机把默认路由指向本 VLAN 的三层接口，由它改 MAC 并转发。
draft: false
---

两个 VLAN 在交换机上不会互相转发帧。要通信，中间得有一个三层接口：每边一个地址，打开转发。主机不直接寻找对方的 MAC，而是把包交给自己的网关。网关再按目的 IP 从另一个 VLAN 送出去。

下面用网桥上的 VLAN 子接口当这两个网关。h1 在 VLAN 10，h2 在 VLAN 20。

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

bridge vlan add dev v1b vid 10 pvid untagged
bridge vlan add dev v2b vid 20 pvid untagged
bridge vlan del dev v1b vid 1
bridge vlan del dev v2b vid 1

ip link add link br0 name br0.10 type vlan id 10
ip link add link br0 name br0.20 type vlan id 20
ip addr add 192.168.10.254/24 dev br0.10
ip addr add 192.168.20.254/24 dev br0.20
ip link set br0.10 up
ip link set br0.20 up
bridge vlan add dev br0 vid 10 self
bridge vlan add dev br0 vid 20 self
sysctl -w net.ipv4.ip_forward=1

ip netns exec h1 ip addr add 192.168.10.1/24 dev v1
ip netns exec h1 ip link set v1 up
ip netns exec h1 ip route add default via 192.168.10.254
ip netns exec h2 ip addr add 192.168.20.1/24 dev v2
ip netns exec h2 ip link set v2 up
ip netns exec h2 ip route add default via 192.168.20.254
```

`bridge vlan del` 若提示 VLAN 1 不存在，跳过那一行。`bridge vlan show` 里，`br0` 自己要有 10 和 20。没有 `self` 这两行，子接口收不到对应 VLAN 的帧。

先看主机有没有路由，再 ping：

```bash
ip netns exec h1 ip route
ip netns exec h1 ping -c 1 192.168.20.1
```

`ip route` 里要有 `default via 192.168.10.254`。没有这行时，ping 会报网络不可达，包根本没出去。网关地址要落在主机自己的网段里，VLAN 20 的主机不能把网关写成 `192.168.10.254`。

通了之后看三样东西。

路由器（这个例子里就是跑命令的系统）上有两条 ARP，分别在两个子接口上：

```bash
ip neigh show
```

应能看到 `192.168.10.1` 在 `br0.10`，`192.168.20.1` 在 `br0.20`。

两侧抓包，MAC 已经换过，TTL 少了 1。先看网关的 MAC：

```bash
ip link show br0.10
ip netns exec h1 tcpdump -ni v1 -e -v -c 1 icmp &
ip netns exec h2 tcpdump -ni v2 -e -v -c 1 icmp &
sleep 1
ip netns exec h1 ping -c 1 192.168.20.1
```

h1 那一侧，目的 MAC 是网关，不是 h2。h2 那一侧，源 MAC 是网关，目的 MAC 才是 h2。h2 抓到的 TTL 比 h1 发出去的少 1。这三处和「同一 VLAN 里直连 ping」不同。同一 VLAN 里，两端 MAC 就是两台主机，TTL 不变。

`ip_forward` 是 0 时，h1 的请求能到 `br0.10`，`br0.20` 上看不到它，ping 超时。请求到了网关却没有离开，就是转发没开，不是 VLAN 没配上。

有请求、没有应答时，再看 `sysctl net.ipv4.conf.all.rp_filter`。值是 1 时，改成 2 再试一次。

```bash
ip netns del h1
ip netns del h2
ip link del br0
```
