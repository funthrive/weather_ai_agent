# 主应用文件：创建Web服务，处理前端请求
from flask import Flask, render_template, request, jsonify, send_from_directory
from core.weather import get_weather_data, format_weather_data, get_weather_alerts
from core.ai_advisor import get_ai_advice
from core.database import save_weather_record, save_advice_record, get_last_weather_record, get_weather_history, get_advice_history
from datetime import datetime
import requests

# 创建Flask应用实例
app = Flask(__name__)

# 配置静态文件路径
app.config['STATIC_FOLDER'] = 'static'
app.config['TEMPLATE_FOLDER'] = 'templates'

# 存储前端回调函数（用于定时更新）
# frontend_callbacks = {}

@app.route('/')
def index():
    """
    主页面路由：返回前端HTML页面
    """
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """
    静态文件服务路由
    """
    return send_from_directory('static', filename)

@app.route('/get_weather', methods=['POST'])
def get_weather():
    """
    获取天气数据API接口
    接收前端发送的经纬度，返回天气数据
    """
    try:
        # 获取前端发送的JSON数据
        data = request.get_json()
        lat = data.get('lat')  # 纬度
        lon = data.get('lon')  # 经度
        
        # 验证经纬度是否有效
        if not lat or not lon:
            return jsonify({'error': '缺少经纬度参数'}), 400
        
        # 获取天气数据
        weather_data = get_weather_data(lat, lon)
        
        if weather_data:
            # 获取预警信息
            alerts = get_weather_alerts(weather_data)
            
            # 保存到数据库
            record_id = save_weather_record(lat, lon, weather_data, alerts, source='manual')
            
            # 获取上一的天气记录（排除当前刚插入的记录）
            previous_record = get_last_weather_record(lat, lon, exclude_id=record_id)
            
            # 返回JSON响应
            return jsonify({
                'success': True,
                'weather': weather_data,
                'formatted': format_weather_data(weather_data),
                'alerts': alerts,
                'record_id': record_id,
                'previous_record': previous_record
            })
        else:
            # 返回错误
            return jsonify({'error': '获取天气数据失败'}), 500
            
    except Exception as e:
        import traceback
        print("后端报错：", e)
        traceback.print_exc()  # 打印完整错误报告
        return jsonify({'error': f'服务器错误: {str(e)}'}), 500

@app.route('/get_location_name', methods=['POST'])
def get_location_name():
    """
    获取位置名称建议API接口
    """
    data = request.get_json()
    lat = data.get('lat')
    lon = data.get('lon')
    try:
        from config import WeatherConfig
        api_key = WeatherConfig.API_KEY
        if not api_key:
            return jsonify({'location_name': ''})
        url = f'http://api.openweathermap.org/geo/1.0/reverse?lat={lat}&lon={lon}&limit=1&appid={api_key}'
        resp = requests.get(url)
        if resp.status_code == 200 and resp.json():
            info = resp.json()[0]
            name = info.get('name', '')
            country = info.get('country', '')
            state = info.get('state', '')
            display = name
            if state:
                display += f', {state}'
            if country:
                display += f', {country}'
            return jsonify({'location_name': display})
        return jsonify({'location_name': ''})
    except Exception as e:
        print('get_location_name error:', e)
        return jsonify({'location_name': ''})

@app.route('/get_advice', methods=['POST'])
def get_advice():
    """
    获取AI建议API接口
    """
    try:
        data = request.get_json()
        weather_data = data.get('weather_data')
        last_update_weather_data = data.get('last_update_weather_data')
        previous_weather_data = data.get('previous_weather_data')
        record_id = data.get('record_id')
        force_update = data.get('force_update', False)

        ai_result = get_ai_advice(weather_data, last_update_weather_data, previous_weather_data, force_update)
        advice = ai_result.get('advice')
        need_update = ai_result.get('need_update', True)

        if record_id and advice:
            save_advice_record(record_id, advice, update_type='forced' if force_update else 'auto')
        return jsonify({
            'success': True,
            'advice': advice,
            'need_update': need_update
        })

    except Exception as e:
        return jsonify({'error': f'生成建议失败: {str(e)}'}), 500
'''功能已迁移至前端
@app.route('/start_scheduler', methods=['POST'])
def start_scheduler():
    """
    启动定时天气更新
    """
    try:
        # 开启定时器
        data = request.get_json()
        lat = data.get('lat')
        lon = data.get('lon')
        interval = data.get('interval', 60)  # 默认60秒
        
        if not lat or not lon:
            return jsonify({'error': '缺少经纬度参数'}), 400
        
        return jsonify({
            'success': True,
            'message': f'定时天气更新已启动，间隔: {interval}秒'
        })
        
    except Exception as e:
        return jsonify({'error': f'启动定时任务失败: {str(e)}'}), 500

@app.route('/stop_scheduler', methods=['POST'])
def stop_scheduler():
    """
    停止定时天气更新
    """
    try:
        # 停止定时器
        return jsonify({
            'success': True,
            'message': '定时天气更新已停止'
        })
        
    except Exception as e:
        return jsonify({'error': f'停止定时任务失败: {str(e)}'}), 500
'''
@app.route('/get_history', methods=['POST'])
def get_history():
    """
    获取历史记录API接口
    """
    try:
        data = request.get_json()
        lat = data.get('lat')
        lon = data.get('lon')
        limit = data.get('limit', 10)
        
        if not lat or not lon:
            return jsonify({'error': '缺少经纬度参数'}), 400
        
        # 获取天气历史记录
        history = get_weather_history(lat, lon, limit)
        
        # 格式化历史记录
        formatted_history = []
        for record in history:
    # 获取对应的建议记录（传递纬度、经度和limit）
            advice_history = get_advice_history(record['latitude'], record['longitude'], limit)
    
            formatted_history.append({
                'id': record['id'],
                'timestamp': record['timestamp'],
                'formatted': format_weather_data(record['weather_data']),
                'alerts': record['alerts'],
                'source': record['source'],
                'advice_history': advice_history,
                'timezone': record.get('timezone', 'Asia/Shanghai')
            })
        
        return jsonify({
            'success': True,
            'history': formatted_history
        })
            
    except Exception as e:
        return jsonify({'error': f'获取历史记录失败: {str(e)}'}), 500
    

'''功能已迁移至前端
@app.route('/register_callback', methods=['POST'])
def register_callback():
    """
    注册前端回调函数（用于定时更新）
    """
    try:
        data = request.get_json()
        client_id = data.get('client_id')
        
        if client_id:
            # 存储客户端ID和回调函数
            frontend_callbacks[client_id] = {
                'timestamp': datetime.now(),
                'active': True
            }
            
            return jsonify({'success': True})
        else:
            return jsonify({'error': '缺少客户端ID'}), 400
            
    except Exception as e:
        return jsonify({'error': f'注册回调失败: {str(e)}'}), 500
'''
# 启动Flask应用
if __name__ == '__main__':
    # 运行应用，开启调试模式（开发时使用）
    app.run(debug=True, host='0.0.0.0', port=5000)