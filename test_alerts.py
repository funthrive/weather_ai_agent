# 测试脚本：验证天气预警功能是否正常工作

from core.weather import get_weather_alerts

# 模拟包含预警信息的天气数据
test_weather_data_with_alerts = {
    'alerts': [
        {
            'sender_name': '气象局',
            'event': '暴雨预警',
            'start': 1684952747,  # Unix时间戳
            'end': 1684988747,    # Unix时间戳
            'description': '预计未来3小时内将有暴雨，请做好防范措施。'
        },
        {
            'sender_name': '气象局',
            'event': '大风预警',
            'start': 1684952747,
            'end': 1684988747,
            'description': '预计未来6小时内将有8级以上大风，请注意安全。'
        }
    ]
}

# 模拟没有预警信息的天气数据
test_weather_data_no_alerts = {
    'current': {
        'temp': 25,
        'humidity': 60
    }
}

def test_alerts_detection():
    """测试预警检测功能"""
    print("测试预警检测功能...")
    
    # 测试有预警的情况
    alerts = get_weather_alerts(test_weather_data_with_alerts)
    print(f"检测到 {len(alerts)} 条预警信息")
    for alert in alerts:
        print(alert)
        print("---")
    
    # 测试无预警的情况
    alerts = get_weather_alerts(test_weather_data_no_alerts)
    print(f"无预警时检测到 {len(alerts)} 条预警信息")
    
    print("✅ 预警检测测试完成")

if __name__ == "__main__":
    test_alerts_detection()