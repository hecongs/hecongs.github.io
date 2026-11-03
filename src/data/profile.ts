/**
 * 个人资料：关于页与经历页共用。
 * 只改这里，两个页面自动更新。
 */
export const PROFILE = {
  name: '何聪',
  role: '测试开发工程师',
  tagline: '无线芯片 · 驱动验证 · 自动化台架',
  bio: [
    '测试开发工程师，做无线芯片和模组的验证。2022 年 7 月入行，现居成都。工作按产品分成四段：蓝牙音频芯片的功能与版本回归，BLE Mesh 与 ZigBee 模组的协议和产测，存储芯片 ATE / SLT 的 Pattern 与上位机，目前负责 Windows 上的 Wi-Fi Dongle 驱动测试台架。',
    '手段按层固定。协议层用 Wireshark、Ubiqua 核对配网、入网和 OTA；系统层用 Python 写用例和上位机，Jenkins、GitLab CI 做回归；硬件层用示波器、逻辑分析仪和功耗仪核对时序、电平和功耗。失败进 Jira，结论要能对上日志、报文或仪器记录。',
    'Addy Osmani 说，执行变便宜以后，留下来的是品味和判断：知道什么算好，以及这个好要付什么代价。',
  ],
  focus: ['协议栈与抓包', '自动化台架', 'HIL 与产线测试', '功耗与时序'],
  facts: [
    { label: '所在城市', value: '成都' },
    { label: '方向', value: '测试开发 · 驱动验证' },
    { label: '协议', value: 'BLE Mesh · ZigBee · Wi-Fi' },
    { label: '工具链', value: 'Python · Jenkins · Wireshark' },
  ],
  links: [{ label: 'Email', href: 'mailto:StormHcc@outlook.com' }],
  now: [
    '把 WiFi Dongle 台架的连接判定从「关联成功」改成「拿到本网段地址」，负例单独判。',
    '整理换 AP 只改控制方式的台架结构，避免每换一台路由器就复制一套用例。',
  ],
};
