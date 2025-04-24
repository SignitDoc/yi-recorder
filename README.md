# 易录屏

一个使用 Electron 开发的简洁高效的屏幕录制工具，能够快速录制屏幕活动并保存为视频文件。

![应用预览](./assets/logo.svg)

## 功能特点

- 🎥 一键开始录制整个屏幕，多屏幕状态下可自由选择要录制屏幕
- ⏱️ 实时显示录制时长
- ⏯️ 支持暂停/恢复录制功能
- 🕒 支持设置最大录制时长，到达时间后自动停止录制
- 👁️ 录制完成后提供视频预览功能
- 💻 录制开始后自动最小化窗口，不影响录制内容
- 💾 支持将录制内容保存为 WebM/MP4 格式
- 🖥️ 跨平台支持（Windows/macOS/Linux）
- 🚀 轻量级，功能精简，启动快速，占用资源少

## 截图展示

![image](https://github.com/user-attachments/assets/f8042860-134b-43c6-b5f6-7cc3ab4679f4)

## 安装方法

### 从发布版本安装

1. 前往 [Releases](https://github.com/yourusername/yi-recorder/releases) 页面
2. 下载适合您操作系统的安装包：
   - **Windows**：
     - `易录屏-Setup-1.1.0.exe` - 安装版本
     - `易录屏-Portable-1.1.0.exe` - 便携版本
3. 安装版直接运行安装，便携版可以直接打开使用

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

3. 启动应用（开发模式）

   ```bash
   npm start
   ```

4. 构建应用（生成安装程序和便携版）

   ```bash
   npm run build-win
   ```

   构建后的文件会生成在 `dist` 目录下

## 使用说明

1. 启动应用程序
2. 可选择是否录制系统声音，并设置最大录制时长（0 表示无限制，默认为 60 分钟）
3. 点击"开始录制"按钮开始录制屏幕
4. 多屏幕状态下，选择要录制的屏幕
5. 应用将在倒计时 3 秒后自动最小化，录制继续在后台进行
6. 录制过程中，可以点击任务栏中的应用图标，使用"暂停录制"按钮暂停录制，再次点击继续录制
7. 需要停止录制时，点击任务栏中的应用图标，然后点击"停止录制"
8. 录制结束后会显示视频预览，可以查看录制内容
9. 点击"保存录制"，选择保存位置即可生成 MP4 格式视频文件

## 技术栈

- Electron - 跨平台桌面应用框架
- JavaScript - 主要编程语言
- HTML/CSS - 用户界面
- WebRTC - 屏幕捕获技术
- FFmpeg - 视频处理

## 开发计划

- [x] 支持录制视频另存为 mp4 格式
- [x] 支持多屏幕选择
- [x] 支持音频录制
- [x] 添加暂停/恢复录制功能
- [x] 添加录制预览功能
- [x] 添加录制时长限制功能
- [ ] 添加录制区域选择功能
- [ ] 支持对录制后的视频进行二次处理

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 开源许可

本项目采用 [Apache License 2.0](LICENSE) 许可证。

## 版权声明

Copyright 2025 易录屏

---

如果您觉得这个项目有用，请给它一个星标 ⭐️！
