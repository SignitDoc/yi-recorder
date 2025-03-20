# 易录屏

一个使用 Electron 开发的简洁高效的易录屏，能够快速录制屏幕活动并保存为视频文件。

![应用预览](./assets/logo.svg)

## 功能特点

- 🎥 一键开始录制整个屏幕
- ⏱️ 实时显示录制时长
- 💻 录制开始后自动最小化窗口，不影响录制内容
- 💾 支持将录制内容保存为 WebM 格式
- 🖥️ 跨平台支持（Windows/macOS/Linux）
- 🚀 轻量级，启动快速，占用资源少

## 截图展示

![image](https://github.com/user-attachments/assets/f8042860-134b-43c6-b5f6-7cc3ab4679f4)


## 安装方法

### 从发布版本安装

1. 前往 [Releases](https://github.com/yourusername/yi-recorder/releases) 页面
2. 下载适合您操作系统的安装包
3. 解压后直接运行（便携版）或安装后运行

### 从源码构建

1. 克隆仓库

   ```bash
   git clone https://github.com/yourusername/yi-recorder.git
   cd yi-recorder
   ```

2. 安装依赖

   ```bash
   npm install
   ```

3. 启动应用

   ```bash
   npm start
   ```

4. 打包应用
   ```bash
   npm run package-win    # Windows版本
   ```

## 使用说明

1. 启动应用程序
2. 点击"开始录制"按钮开始录制屏幕
3. 应用将在 1 秒后自动最小化，录制继续在后台进行
4. 需要停止录制时，点击任务栏中的应用图标，然后点击"停止录制"
5. 点击"保存录制"，选择保存位置即可生成视频文件

## 技术栈

- Electron - 跨平台桌面应用框架
- JavaScript - 主要编程语言
- HTML/CSS - 用户界面
- WebRTC - 屏幕捕获技术

## 开发计划

- [ ] 支持音频录制
- [ ] 添加录制区域选择功能
- [ ] 支持更多视频格式
- [ ] 添加视频编辑功能
- [ ] 优化视频质量选项

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 开源许可

本项目采用 [Apache License 2.0](LICENSE) 许可证。这意味着您可以：

- 自由使用、修改和分发本软件
- 用于商业用途
- 创建衍生作品
- 私有使用

只要您遵守以下条件：

- 包含原始许可证和版权声明
- 声明对源代码的修改
- 包含 NOTICE 文件（如果有）

## 版权声明

Copyright 2024 易录屏

---

如果您觉得这个项目有用，请给它一个星标 ⭐️！
