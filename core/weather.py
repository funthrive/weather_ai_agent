# 天气数据获取模块：负责从OpenWeatherMap API获取天气信息，包括预警信号

import requests  # 用于发送HTTP请求
from config import WeatherConfig  # 导入天气配置
from datetime import datetime  # 用于时间处理

def get_weather_data(lat, lon):
    """
    获取指定经纬度的天气数据
    :param lat: 纬度
    :param lon: 经度
    :return: 字典格式的天气数据，如果失败返回None
    """
    # 构建请求参数
    params = {
        'lat': lat,          # 纬度参数
        'lon': lon,          # 经度参数
        'appid': WeatherConfig.API_KEY,  # API密钥
        'units': WeatherConfig.UNITS,    # 单位制
        'lang': 'zh_cn'      # 使用中文描述
    }
    
    try:
        # 发送GET请求到天气API，设置超时时间10秒
        response = requests.get(WeatherConfig.API_URL, params=params, timeout=10)
        # 检查响应状态码，200表示成功
        if response.status_code == 200:
            # 解析JSON格式的响应数据
            weather_data = response.json()
            return weather_data  # 返回天气数据
        else:
            # 请求失败时打印错误信息
            print(f"天气API请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            return None
    except requests.exceptions.Timeout:
        print("天气API请求超时")
        return None
    except requests.exceptions.RequestException as e:
        # 处理网络请求异常
        print(f"网络请求错误: {e}")
        return None
    except ValueError as e:
        # 处理JSON解析错误
        print(f"JSON解析错误: {e}")
        return None

def format_weather_data(weather_data):
    """
    格式化天气数据为更易读的文本
    :param weather_data: 原始天气数据
    :return: 格式化后的字符串
    """
    if not weather_data:
        return "无法获取天气数据"
    
    try:
        current = weather_data.get('current', {})
        
        # 提取当前天气信息
        temperature = current.get('temp', 'N/A')
        humidity = current.get('humidity', 'N/A')
        description = current['weather'][0]['description'] if current.get('weather') else 'N/A'
        wind_speed = current.get('wind_speed', 'N/A')
        pressure = current.get('pressure', 'N/A')
        feels_like = current.get('feels_like', 'N/A')
        
        # 获取位置信息
        timezone = weather_data.get('timezone', 'N/A')
        
        # 构建格式化字符串
        formatted_text = (
            f"🌡️ 温度: {temperature}°C (体感 {feels_like}°C)\n"
            f"💧湿度: {humidity}%\n"
            f"🌤️ 天气: {description}\n"
            f"💨风速: {wind_speed} m/s\n"
            f"📊气压: {pressure} hPa\n"
            f"📍时区: {timezone}"
        )
        
        return formatted_text
        
    except Exception as e:
        print(f"格式化天气数据时出错: {e}")
        return "天气数据格式错误"

def get_weather_alerts(weather_data):
    """
    提取并格式化天气预警信息
    :param weather_data: 原始天气数据
    :return: 预警信息列表，如果没有预警返回空列表
    """
    alerts = []
    
    if not weather_data or 'alerts' not in weather_data:
        return alerts
    
    try:
        # 遍历所有预警信息
        for alert in weather_data['alerts']:
            # 转换时间戳为可读格式
            start_time = datetime.fromtimestamp(alert['start']).strftime('%Y-%m-%d %H:%M')
            end_time = datetime.fromtimestamp(alert['end']).strftime('%Y-%m-%d %H:%M')
            
            # 构建预警信息字符串
            alert_info = (
                f"⚠️ {alert['event']}\n"
                f"🕐 时间: {start_time} - {end_time}\n"
                f"📝 描述: {alert['description']}\n"
                f"🏢 发布单位: {alert['sender_name']}"
            )
            
            alerts.append(alert_info)
            
    except Exception as e:
        print(f"处理预警信息时出错: {e}")
    
    return alerts