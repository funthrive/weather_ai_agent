import os
from dotenv import load_dotenv  # 从.env文件加载环境变量

# 加载.env文件中的环境变量
load_dotenv()

# DeepSeek API配置
class DeepSeekConfig:
    API_KEY = os.getenv('DEEPSEEK_API_KEY')  # 从环境变量获取API密钥
    API_URL = "https://api.deepseek.com"    # API基础地址
    MODEL = "deepseek-chat"                  # 使用的模型名称

# OpenWeatherMap API配置
class WeatherConfig:
    API_KEY = os.getenv('OWM_API_KEY')       # 从环境变量获取API密钥
    API_URL = "https://api.openweathermap.org/data/3.0/onecall"  # API地址
    UNITS = "metric"                         # 使用公制单位（摄氏度）