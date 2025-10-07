# Weather AI Agent

一个基于 Flask + AI 的智能天气助手网站，目前支持自动获取天气数据、AI智能建议、历史记录、自动定时刷新功能

## 功能简介

- 🌤️ 实时获取当前位置天气数据
- 🤖 AI 智能生成生活建议（支持自动监控和手动申请）
- 🕒 自动定时刷新天气和建议
- 📜 历史天气记录查询
- ⚠️ 天气预警信息展示
- 🖥️ 界面美观，支持 Markdown 格式建议渲染

## 技术栈

- 后端：Python 3, Flask, Gunicorn
- 前端：HTML, CSS, JavaScript, marked.js
- 数据库：SQLite
- 天气数据：OpenWeatherMap One Call API 3.0
- AI建议：DeepSeek API

## 快速启动

1. 克隆项目

   ```bash
   git clone https://github.com/funthrive/weather_ai_agent.git
   cd weather_ai_agent
   ```

2. 安装依赖

   ```bash
   pip install -r requirements.txt
   ```

3. 配置环境变量

   - 在项目根目录新建 `.env` 文件，填入你的 API KEY 等信息
   - 示例：
     ```
     DEEPSEEK_API_KEY=你的key
     OWM_API_KEY=你的key（建议使用OpenWeatherMap API Key，防止兼容性问题）
     ```

4. 启动项目

   ```bash
   python app.py
   ```

5. 浏览器访问

   ```
   http://localhost:5000
   ```

## 目录结构

```
weather_ai_agent/
├── app.py                # 主应用入口
├── core/                 # 业务核心模块
│   ├── ai_advisor.py     # AI建议模块
│   ├── database.py       # 数据库模块
│   └── weather.py        # 天气数据模块
├── config.py             # 配置文件
├── static/               # 前端静态资源
│   ├── style.css
│   ├── script.js
│   └── marked.min.js     # markdown转换模块
├── templates/
│   └── index.html        # 主页面模板
├── requirements.txt      # Python依赖
└── README.md             # 项目说明（看看我）
```

## 贡献与交流
（感谢腾讯元宝，DeepSeek,GitHub Copilot的 大 力 支 持 ！）

欢迎交流和建议！

---

**本项目仅供学习和交流，部分功能需配置第三方 API KEY。**
