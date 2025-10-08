# 数据库模块：用于存储天气数据和建议记录

import sqlite3
import json

# 初始化数据库，创建必要的表
def init_db():
    """
    初始化数据库，创建必要的表
    这个函数在应用启动时调用，确保数据库表存在
    """
    conn = sqlite3.connect('weather_ai.db')
    cursor = conn.cursor()
    
    # 创建天气记录表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS weather_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        weather_data TEXT NOT NULL,
        alerts TEXT,
        source TEXT DEFAULT 'auto'  -- 'auto'表示自动更新，'manual'表示用户请求
    )
    ''')
    
    # 创建建议记录表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS advice_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        weather_record_id INTEGER NOT NULL,
        advice_text TEXT NOT NULL,
        update_type TEXT NOT NULL,  -- 'forced'表示强制更新，'auto'表示自动判断更新
        FOREIGN KEY (weather_record_id) REFERENCES weather_records (id)
    )
    ''')
    
    # 创建索引以提高查询性能
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_records (latitude, longitude)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_weather_timestamp ON weather_records (timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_advice_weather_id ON advice_records (weather_record_id)')
    
    conn.commit()
    conn.close()
    print("数据库初始化完成")

# 保存天气记录
def save_weather_record(lat, lon, weather_data, alerts, source='auto'):
    """
    保存一条天气记录到数据库
    :param lat: 纬度
    :param lon: 经度
    :param weather_data: 天气数据（字典）
    :param alerts: 预警信息（列表）
    :param source: 来源（'auto'或'manual'）
    :return: 新记录的ID，失败返回None
    """
    try:
        if alerts is None:
            alerts = []
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO weather_records (latitude, longitude, weather_data, alerts, source)
        VALUES (?, ?, ?, ?, ?)
        ''', (lat, lon, json.dumps(weather_data), json.dumps(alerts), source))
        record_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return record_id
    except Exception as e:
        print(f"[数据库] 保存天气记录失败: {e}")
        return None

# 保存建议记录
def save_advice_record(weather_record_id, advice_text, update_type='forced'):
    """
    保存一条建议记录到数据库
    :param weather_record_id: 对应天气记录ID
    :param advice_text: 建议内容
    :param update_type: 更新类型（'forced'或'auto'）
    """
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO advice_records (weather_record_id, advice_text, update_type)
        VALUES (?, ?, ?)
        ''', (weather_record_id, advice_text, update_type))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[数据库] 保存建议记录失败: {e}")

# 获取指定位置的最新天气记录
def get_last_weather_record(lat, lon):
    """
    获取指定位置的最新天气记录
    :param lat: 纬度
    :param lon: 经度
    :return: 天气记录字典，如果没有记录返回None
    """
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, timestamp, weather_data, alerts, source
        FROM weather_records
        WHERE latitude = ? AND longitude = ?
        ORDER BY timestamp DESC
        LIMIT 1
        ''', (lat, lon))
        record = cursor.fetchone()
        conn.close()
        if record:
            return {
                'id': record[0],
                'timestamp': record[1],
                'weather_data': json.loads(record[2]),
                'alerts': json.loads(record[3]),
                'source': record[4]
            }
        else:
            return None
    except Exception as e:
        print(f"[数据库] 查询最新天气记录失败: {e}")
        return None

# 获取指定位置的最新建议记录

def get_last_weather_record(lat, lon, exclude_id=None):
    """
    获取指定位置的最新天气记录（可选排除某条记录）
    :param lat: 纬度
    :param lon: 经度
    :param exclude_id: 排除的记录ID（如当前刚插入的ID）
    :return: 天气记录字典，如果没有记录返回None
    """
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        if exclude_id:
            cursor.execute('''
            SELECT id, timestamp, weather_data, alerts, source
            FROM weather_records
            WHERE latitude = ? AND longitude = ? AND id < ?
            ORDER BY timestamp DESC
            LIMIT 1
            ''', (lat, lon, exclude_id))
        else:
            cursor.execute('''
            SELECT id, timestamp, weather_data, alerts, source
            FROM weather_records
            WHERE latitude = ? AND longitude = ?
            ORDER BY timestamp DESC
            LIMIT 1
            ''', (lat, lon))
        record = cursor.fetchone()
        conn.close()
        if record:
            return {
                'id': record[0],
                'timestamp': record[1],
                'weather_data': json.loads(record[2]),
                'alerts': json.loads(record[3]),
                'source': record[4]
            }
        else:
            return None
    except Exception as e:
        print(f"[数据库] 查询最新天气记录失败: {e}")
        return None

# 获取指定位置的天气历史记录
def get_weather_history(lat, lon, limit=10):
    """
    获取指定位置的天气历史记录
    :param lat: 纬度
    :param lon: 经度
    :param limit: 返回的记录数量限制
    :return: 天气历史记录列表
    """
    import pytz
    from datetime import datetime
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, timestamp, latitude, longitude, weather_data, alerts, source
        FROM weather_records
        WHERE latitude = ? AND longitude = ?
        ORDER BY timestamp DESC
        LIMIT ?
        ''', (lat, lon, limit))
        records = cursor.fetchall()
        conn.close()
        history = []
        for record in records:
            weather_data = json.loads(record[4])
            tz_name = weather_data.get('timezone', 'Asia/Shanghai')
            try:
                tz = pytz.timezone(tz_name)
            except Exception:
                tz = pytz.timezone('Asia/Shanghai')
            # record[1] 可能是字符串或datetime
            if isinstance(record[1], str):
                utc_dt = datetime.strptime(record[1], '%Y-%m-%d %H:%M:%S')
            else:
                utc_dt = record[1]
            utc_dt = pytz.utc.localize(utc_dt)
            local_dt = utc_dt.astimezone(tz)
            local_dt_str = local_dt.strftime('%Y-%m-%d %H:%M:%S')
            history.append({
                'id': record[0],
                'timestamp': local_dt_str,
                'latitude': record[2],
                'longitude': record[3],
                'weather_data': weather_data,
                'alerts': json.loads(record[5]),
                'source': record[6],
                'timezone': tz_name
            })
        return history
    except Exception as e:
        print(f"[数据库] 查询天气历史记录失败: {e}")
        return []

# 获取指定位置的建议历史记录
def get_advice_history(lat, lon, limit=10):
    """
    获取指定位置的建议历史记录
    :param lat: 纬度
    :param lon: 经度
    :param limit: 返回的记录数量限制
    :return: 建议历史记录列表
    """
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        SELECT a.id, a.timestamp, a.advice_text, a.update_type, w.id as weather_id
        FROM advice_records a
        JOIN weather_records w ON a.weather_record_id = w.id
        WHERE w.latitude = ? AND w.longitude = ?
        ORDER BY a.timestamp DESC
        LIMIT ?
        ''', (lat, lon, limit))
        records = cursor.fetchall()
        conn.close()
        advice_history = []
        for record in records:
            advice_history.append({
                'id': record[0],
                'timestamp': record[1],
                'advice_text': record[2],
                'update_type': record[3],
                'weather_record_id': record[4]
            })
        return advice_history
    except Exception as e:
        print(f"[数据库] 查询建议历史记录失败: {e}")
        return []

# 获取指定位置最近一段时间内的天气记录
def get_recent_weather_records(lat, lon, hours=24):
    """
    获取指定位置最近一段时间内的天气记录
    :param lat: 纬度
    :param lon: 经度
    :param hours: 时间范围（小时）
    :return: 天气记录列表
    """
    try:
        conn = sqlite3.connect('weather_ai.db')
        cursor = conn.cursor()
        cursor.execute('''
        SELECT id, timestamp, weather_data, alerts, source
        FROM weather_records
        WHERE latitude = ? AND longitude = ? 
        AND timestamp >= datetime('now', ?)
        ORDER BY timestamp DESC
        ''', (lat, lon, f'-{hours} hours'))
        records = cursor.fetchall()
        conn.close()
        recent_records = []
        for record in records:
            recent_records.append({
                'id': record[0],
                'timestamp': record[1],
                'weather_data': json.loads(record[2]),
                'alerts': json.loads(record[3]),
                'source': record[4]
            })
        return recent_records
    except Exception as e:
        print(f"[数据库] 查询最近天气记录失败: {e}")
        return []

# 初始化数据库（应用启动时自动执行）
init_db()