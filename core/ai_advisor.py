# AI建议生成模块：负责调用DeepSeek API生成天气建议和判断是否需要更新

import requests  # 用于发送HTTP请求
import json
from config import DeepSeekConfig  # 导入DeepSeek配置
from core.weather import get_weather_alerts  # 导入天气相关函数

def extract_brief_current(weather):
    """
    只提取 current 部分（去掉 sunrise/sunset），并保留 alerts
    """
    if not weather or 'current' not in weather:
        return {}
    current = dict(weather['current'])  # 拷贝一份
    current.pop('sunrise', None)
    current.pop('sunset', None)
    # 只保留 alerts 字段（如果有）
    alerts = weather.get('alerts', [])
    return {
        "current": current,
        "alerts": alerts,
        "timezone": weather.get("timezone"),
        "timezone_offset": weather.get("timezone_offset"),
        "lat": weather.get("lat"),
        "lon": weather.get("lon")
    }

def get_ai_advice(current_weather_data, last_update_weather_data=None, previous_weather_data=None, force_update=False):
    """
    基于天气数据获取AI建议
    :param current_weather_data: 当前天气数据字典
    :param previous_weather_data: 之前的天气数据字典（可选）
    :param force_update: 是否强制更新建议（用户主动请求时使用）
    :return: 字典包含建议文本和是否需要更新的标志
    """
    if not current_weather_data:
        return {"advice": "无法获取天气数据，请检查网络连接或API配置", "need_update": False}
    
    try:
        # 获取当前预警信息
        current_alerts = get_weather_alerts(current_weather_data)
        
        # 根据是否强制更新选择不同的系统提示词
        if force_update:
            system_prompt = """你是一个专业的天气助手。请根据提供的天气数据，生成一份结构化的天气建议，务必采用markdown格式规范回答保证美观，但不要用代码块（```）包裹，内容包括：
            1. 今日建议：针对当前天气给出实用建议。
            2. 未来几日提醒：如果有未来天气趋势，给出提醒。
            3. 安全建议：针对天气和预警给出安全方面的建议。
            4. 预警信息特别建议（只有有预警信息才需要）：如果有预警信息，请单独给出特别提醒。
            5. 其他你认为需要给出的建议
            建议要具体、实用、简洁，适合普通用户的日常生活。"""
        else:
            system_prompt = """你是一个专业的天气助手。目前在自动监控天气变化，请根据提供的天气数据，判断相比之前天气变化是否显著，是否需要更新建议。
            如果当前天气相比以前的数据变化显著，则需要更新建议。
            如果天气变化不显著，则不需要更新建议。
            如果需要更新建议，请生成一份结构化的天气建议，建议内容包括：
            1. 今日建议：针对当前天气给出实用建议。
            2. 未来几日提醒：如果有未来天气趋势，给出提醒。
            3. 天气变化建议：因为你觉得天气变化显著，需要更新建议，所以请在此模块突出本次天气变化相关的建议。
            4. 安全建议：针对天气和预警给出安全方面的建议。
            5. 预警信息特别建议（只有有预警信息才需要）：如果有预警信息，请单独给出特别提醒。
            6. 其他你认为需要给出的建议
            建议要具体、实用、简洁，适合普通用户的日常生活。
            请按照以下JSON格式输出你的响应：
            {
            "need_update": true/false（如相比之前温度变化显著、天气状况改变、有新的预警信息或者你觉得有任何更新建议的必要则为true，否则为false）, 
            "advice": "你的建议内容（务必采用markdown格式以保证美观，但不要用代码块（```）包裹，要包含完整的建议内容，结构化规范回答，"need_update": false时，此项留空）" 
            }"""
        
        # 准备用户消息
        user_message = f"当前天气数据（完整）：\n{json.dumps(current_weather_data, indent=2)}"

        if last_update_weather_data:
            brief_last_update = extract_brief_current(last_update_weather_data)
            user_message += f"\n\n上次更新时的天气数据（仅供参考）：\n{json.dumps(brief_last_update['current'], indent=2)}"

        if previous_weather_data and not force_update:
            brief_previous = extract_brief_current(previous_weather_data)
            user_message += f"\n\n上一份天气数据（仅供参考）：\n{json.dumps(brief_previous['current'], indent=2)}"
        
        # 添加当前的预警信息
        if current_alerts:
            current_alerts_text = "\n".join(current_alerts)
            user_message += f"\n\n当前有以下天气预警：\n{current_alerts_text}"
        
        # 使用requests直接调用DeepSeek API
        headers = {
            "Authorization": f"Bearer {DeepSeekConfig.API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": DeepSeekConfig.MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "stream": False
        }
        
        # 如果不是强制更新，要求返回JSON格式
        if not force_update:
            data["response_format"] = {"type": "json_object"}
        
        # 发送POST请求到DeepSeek API
        response = requests.post(
            f"{DeepSeekConfig.API_URL}/chat/completions",
            headers=headers,
            json=data
        )
        
        # 检查响应状态
        if response.status_code == 200:
            response_data = response.json()
            ai_response = response_data['choices'][0]['message']['content']
            
            if force_update:
                # 强制更新时，直接返回建议文本
                return {"advice": ai_response, "need_update": True}
            else:
              # 非强制更新时，解析JSON响应
                try:
                    parsed_response = json.loads(ai_response)
                    need_update = parsed_response.get("need_update", False)
                    advice = parsed_response.get("advice", "")
                    return {
                    "advice": advice,
                    "need_update": need_update
                    }
                except Exception as e:
                # 如果JSON解析失败，默认需要更新，且只返回建议内容（markdown）
                    print(f"AI响应不是有效的JSON，默认需要更新建议: {e}")
                    # 只返回建议内容，不返回整个JSON字符串
                    return {"advice": ai_response, "need_update": True}
                
        else:
            print(f"DeepSeek API请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            return {"advice": "抱歉，暂时无法生成建议。请稍后再试。", "need_update": False}
        
    except Exception as e:
        # 处理可能的错误
        print(f"AI建议生成错误: {e}")
        return {"advice": "抱歉，暂时无法生成建议。请稍后再试。", "need_update": False}

def check_need_update(current_weather_data, previous_weather_data):
    """
    检查是否需要更新建议（简化版，使用规则判断）
    :param current_weather_data: 当前天气数据
    :param previous_weather_data: 之前的天气数据
    :return: 布尔值，表示是否需要更新建议
    """
    if not previous_weather_data:
        return True  # 如果没有之前的记录，需要更新
    
    try:
        # 提取当前和之前的温度
        current_temp = current_weather_data.get('current', {}).get('temp', 0)
        previous_temp = previous_weather_data.get('current', {}).get('temp', 0)
        
        # 检查温度变化是否超过5度
        if abs(current_temp - previous_temp) > 5:
            return True
        
        # 检查天气状况是否变化
        current_desc = current_weather_data.get('current', {}).get('weather', [{}])[0].get('main', '')
        previous_desc = previous_weather_data.get('current', {}).get('weather', [{}])[0].get('main', '')
        
        if current_desc != previous_desc:
            return True
        
        # 检查预警信息变化
        current_alerts = current_weather_data.get('alerts', [])
        previous_alerts = previous_weather_data.get('alerts', [])
        
        if len(current_alerts) != len(previous_alerts):
            return True
            
        # 如果没有显著变化，不需要更新
        return False
        
    except Exception as e:
        print(f"检查是否需要更新时出错: {e}")
        return True  # 出错时默认需要更新