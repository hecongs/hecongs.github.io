/**
 * 工作经历。内容来自「何聪_工作经历技术细化.md」，
 * 只保留原文写到的数字与结论，没有额外编造通过率或缺陷数。
 */
export interface Project {
  name: string;
  meta?: string;
  summary?: string;
  points: string[];
}

export interface Job {
  period: string;
  company: string;
  title: string;
  location?: string;
  summary?: string;
  projects: Project[];
  stack?: string[];
  current?: boolean;
}

export const JOBS: Job[] = [
  {
    period: '2022.07 — 2024.05',
    company: '达发芯科技（成都）',
    title: '嵌入式软件测试工程师',
    location: '成都',
    summary:
      '负责蓝牙音频芯片的功能、压力与版本回归。芯片跑在内部 EVK 开发板上，手机侧用 UT App 或 AT 命令操作，日志经 UART 转 USB 后用 Wireshark 看；失败进 Jira，并出测试报告。',
    projects: [
      {
        name: 'Redmi Buds 5 Pro',
        meta: '7x 芯片',
        summary:
          '耳机功能是 Full Adaptive ANC、通透、PEQ。测试在内部 7x EVK 上做，搭配 Android UT App，日志用来核对功能有没有按命令执行、失败停在哪一步。',
        points: [
          '冒烟与版本迭代：每个日常版本先跑通 ANC、通透、PEQ 主路径，确认 App 下发的模式切换、参数加载与回读一致。',
          '用 Selenium 驱动 UT App 做界面功能自动化，把手工点击收成可重复用例，随版本一起回归。',
          '用 Python 对 SOC 与功能路径做反复开关、反复下发，观察命令丢失、状态卡死与回连失败。',
          '守住的结果：BLE 下手机多设备轮转可以完成，测得延迟小于 49ms。',
        ],
      },
      {
        name: 'B&O 耳机',
        meta: '8x 双芯片',
        summary: '同一类音频功能放到双芯片方案上。单芯片那套 App 点击不够用，改成 AT 命令驱动开发板。',
        points: [
          '命令下到开发板，检查 ANC、通透、PEQ 的执行结果，以及两颗芯片之间的状态是否一致。',
          '继续用 Python 做 SOC 功能交互的压力测试，把反复切换、反复配置跑长。',
          '双芯片方案上同时看延迟与音质，确认达到比单芯片更好的结果。',
        ],
      },
    ],
    stack: ['Python', 'JavaScript', 'C', 'Linux', 'Jenkins', 'Selenium', 'Wireshark', 'UART'],
  },
  {
    period: '2024.06 — 2025.04',
    company: '涂鸦智能（杭州）',
    title: '嵌入式软件测试工程师',
    location: '杭州',
    summary:
      '负责 Tuya OS 无线模组的迭代测试，产品线覆盖 BLE Mesh、ZigBee 与 T5（WiFi + BLE）语音陪伴玩具；从 PCBA 与射频产测，到协议栈配网，再到涂鸦云 App 的压测与报告。',
    projects: [
      {
        name: 'BLE Mesh 模组',
        meta: 'BS24 / EFR32BG24',
        summary: '对象是 Tuya OS SDK 在 BG24 上的二次开发，测试按硬件、协议栈、低功耗、云端压测四块做。',
        points: [
          '硬件与产测：PCBA 过站、RF 信标可被扫描、GPIO 电平与方向、RSSI 落在工位可接受范围，用 RSSI 发现天线与匹配问题。',
          '配网不把「手机显示已连接」当通过：分别验证 Proxy、PB-ADV 与 PB-GATT 两条承载，比较连接步骤、耗时与成功率。',
          'Friend 与 LPN：低功耗节点不常醒，测两侧功耗，确认友谊关系建立后消息仍能送达。',
          '群组 OTA：一组节点同时升级，看成功率、掉线，以及升级后版本是否一致。',
          '涂鸦云测 App 做多节点并发上报下发，统计群组响应成功率；失败要能分清未入网、群组地址错、响应超时。',
        ],
      },
      {
        name: 'ZigBee 模组',
        meta: 'Telink TLSR8258',
        summary: '对象是 Tuya OS SDK 在 TLSR8258 上的二次开发，抓包用 NXP Ubiqua。',
        points: [
          '把入网拆开看，而不是只看 App 上是否在线：密钥交换顺序、多跳 Cluster 路由、报文里的 MAC 地址。',
          'OTA 关注所在信道与发包时长，确认升级没有把业务报文堵死；私有协议的 DP 点值与设备状态一致。',
          'P0 用例配成 SSH 连树莓派（Ubuntu）跑 HIL，模组在真实射频环境执行、PC 侧脚本收结果，协议回归不再依赖人守屏蔽箱。',
          '拉距找报文还能转发的极限距离；云测 App 对 DP 点做自动化，并压测功耗数值。',
        ],
      },
      {
        name: 'T5 语音陪伴玩具',
        meta: 'WiFi + BLE',
        summary:
          '负责整机测试计划与 SOP。把测试指标和内容定下来，参与自动化方案，并监测 T5 上大模型对话与 ASR 的准确度。',
        points: [
          '对话质量：是否答非所问、回答是否相关、多轮之后上下文是否还在、内容是否越界。',
          'ASR 用 WER、SER 看识别错误，同时看噪声环境下、口语与非标准说法的识别率衰减。',
          '自动化把语音样本播给设备，再收回识别文本与语义结果比对，避免每次靠人耳听。',
          '无线与升级：WiFi AP 配网稳定性与信号抖动；Wireshark 看包、Ping 看连通、Iperf 看吞吐；OTA 期间功耗单独记。',
          '压力与探索：弱网、高负载下监测内存是否持续上涨；打断说话、连续唤醒、配网中途掉电留手工探索。',
        ],
      },
    ],
    stack: ['Python', 'JavaScript', 'Linux', 'Git', 'Jenkins', 'GitLab', 'Ubiqua', 'Wireshark', 'Iperf'],
  },
  {
    period: '2025.07 — 2026.02',
    company: '成都态坦科技',
    title: '嵌入式系统测试工程师',
    location: '成都',
    summary:
      '负责存储芯片 Pattern 测试的用例评估、设计、执行、跟踪与报告。软件在 Linux 上用 Python 写上位机，SVN/Git 管版本，Jenkins 与 GitLab CI 做回归；硬件侧用万用表、示波器、逻辑分析仪和功耗仪核对供电、时序与功耗。',
    projects: [
      {
        name: 'TA0210 简易 ATE',
        summary: '机台对存储芯片跑 Pattern。从需求拆功能点，写测试方案与用例，把能自动的部分收进 PC 上位机。',
        points: [
          '功能自动化：Python 在 Linux 上把上位机里的测试序列跑起来，减少手工逐步点击。',
          'Pattern 执行：脚本自动加载 Pattern 程式、控制 ATE 开跑，实时回收每步 PASS/FAIL；失败能对上哪一段 Pattern、哪一个工位。',
          '用例组织：Testcase 做成可参数化、可批量的框架，换 Pattern 或条件时改配置，不改一堆脚本。',
          '回归闭环：脚本用 SVN/Git 管版本，Jenkins / GitLab CI 定时回归并自动送报告，失败项进 Jira 跟到有结论。',
          '硬件按原理图搭建，用示波器与逻辑分析仪抓 CLK、DQS、DQ 看时序对齐与边沿完整；功耗仪看动态与静态功耗，抓突然跳变。',
        ],
      },
      {
        name: 'TL1000',
        meta: 'SLT / LPDDR 颗粒',
        summary: 'SLT 系统软件迭代，重点是 LPDDR 协议相关 Pattern 的自动化不能跑丢。',
        points: [
          '用 PyQt 做上位机界面自动化，驱动 LPDDR 全功能 Pattern，按流程动态切换而不是只跑一条固定向量。',
          '多工位并行：同时控多个工位、调度测试资源与结果回收，避免工位抢设备、结果串位。',
          '系统每次迭代后由 Jenkins 跑核心功能回归，确认已有测试项还在。',
          '软件缺陷与协议异常分开记进 Jira；协议异常要能对上 Pattern 与报文/时序现象。',
          '高低温循环里做压力测试，确认温度变化后 Pattern 仍能跑完；万用表在空载运行时量 Vin 的电流电压。',
        ],
      },
    ],
    stack: ['Python', 'PyQt', 'Linux', 'SVN', 'Git', 'Jenkins', 'GitLab CI'],
  },
  {
    period: '2026 — 至今',
    company: '高拓迅达微电子科技',
    title: '测试开发工程师 · Wi-Fi Dongle 驱动验证',
    summary:
      'Windows 上的 USB WiFi Dongle 自动化台架：Jenkins 流水线在测试机上跑用例，路由器既是被测无线网络，也承担测试机到 Jenkins Controller 的上网路径。套件覆盖 2.4G 与 5G 的连接、断开、矩阵、隐藏、打流、自动连接与长测。',
    projects: [
      {
        name: 'WiFi Dongle 台架',
        meta: 'H3C / 小米 BE7000',
        points: [
          '判定改成「地址落在当前路由器子网」：169.254 或异网段说明 DHCP 还没从这台路由器拿到地址；断开类用例只检查链路已断，不空等 DHCP。',
          '矩阵负例单独判：预期不能连接时，即使拿到别的网段地址，只要网卡仍关联在被测 SSID 上就判失败。',
          '重启流水线：测试机步骤只删自动回连的 WLAN profile 并拉起计划任务后立即结束；计划任务等 45 秒再发重启；Controller 等 120 秒重新申请测试机，读重启结果成功才继续长测。',
          '换 AP 只改控制方式：小米走 SSH 改无线配置，H3C 走网页；小米上下发不了的组合（自动信道、5G 自动频宽、160/320MHz）跳过，2.4G「20/40 自动」落成 40MHz。',
        ],
      },
    ],
    stack: ['Python', 'Jenkins', 'Windows', 'SSH', 'Wireshark', 'Iperf'],
    current: true,
  },
];

export interface Education {
  period: string;
  school: string;
  degree: string;
  location?: string;
  note?: string;
}

export const EDUCATION: Education[] = [
  {
    period: '2018.09 — 2022.06',
    school: '四川文理学院',
    degree: '本科 · 计算机科学与技术',
  },
];

/** 技能分组，与项目对应 */
export const SKILLS: { group: string; items: string[] }[] = [
  { group: '语言与脚本', items: ['Python', 'JavaScript', 'Shell', 'C（日志与命令交互）'] },
  { group: '系统与台架', items: ['Linux（Ubuntu / CentOS）搭 HIL', 'Windows WiFi 台架'] },
  { group: '流水线', items: ['Git', 'GitLab', 'SVN', 'Jenkins', '定时回归与报告'] },
  { group: '协议与抓包', items: ['BLE Mesh', 'ZigBee', 'Wi-Fi 802.11b/g/n', 'Wireshark', 'Ubiqua', 'Ellisys'] },
  {
    group: '接口与仪器',
    items: ['UART', 'USB', 'GPIO', 'PWM', 'I2C', '示波器', '逻辑分析仪', '功耗仪', '频谱仪', 'J-Link'],
  },
  { group: '应用层', items: ['Postman', 'Selenium', 'Assistant / Alexa / HomeKit / Matter 认证流程'] },
];
