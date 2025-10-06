# test_fix.py: 测试修复后的代码

import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("测试配置导入...")
try:
    from config import DeepSeekConfig
    print(f"✅ DeepSeekConfig 导入成功")
    print(f"   API_KEY: {'已设置' if DeepSeekConfig.API_KEY else '未设置'}")
    print(f"   API_URL: {DeepSeekConfig.API_URL}")
    print(f"   MODEL: {DeepSeekConfig.MODEL}")
except Exception as e:
    print(f"❌ DeepSeekConfig 导入失败: {e}")
    sys.exit(1)

print("\n测试ai_advisor导入...")
try:
    from core.ai_advisor import get_ai_advice
    print("✅ ai_advisor 导入成功")
except Exception as e:
    print(f"❌ ai_advisor 导入失败: {e}")
    sys.exit(1)

print("\n测试weather导入...")
try:
    from core.weather import get_weather_data, get_weather_alerts
    print("✅ weather 导入成功")
except Exception as e:
    print(f"❌ weather 导入失败: {e}")
    sys.exit(1)

print("\n✅ 所有导入测试通过!")