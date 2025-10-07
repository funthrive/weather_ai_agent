// JavaScript代码：处理前端交互和API调用

// 全局变量
let currentLocation = null;
let currentWeatherData = null;
let currentRecordId = null;
let schedulerActive = false;
let autoUpdateTimer = null; // 定时器
let previousWeatherData = null; // 保存上一次天气数据
let lastUpdateWeatherData = null; // 保存上次更新时的天气数据

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    console.log("页面加载完成，开始初始化...");

    // 初始化按钮状态
    initializeButtonStates();

    // 获取用户地理位置
    getCurrentLocation();
});

// 初始化按钮状态
function initializeButtonStates() {
    // 初始时禁用部分按钮，等待位置获取完成
    setText('last-auto-update', '最后自动更新: -');
    setDisabled('get-advice-btn', true);
    setDisabled('start-scheduler-btn', true);
    setDisabled('stop-scheduler-btn', true);
    setDisabled('show-history-btn', true);
    console.log("按钮状态初始化完成");
}

// 获取用户地理位置
function getCurrentLocation() {
    console.log("开始获取地理位置...");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                // 成功获取位置
                currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };

                console.log("位置获取成功:", currentLocation);

                // 更新位置显示
                setText('current-location', `纬度: ${currentLocation.lat.toFixed(4)}, 经度: ${currentLocation.lon.toFixed(4)}`);
                // 获取城市名并显示
                fetch('/get_location_name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: currentLocation.lat,
                        lon: currentLocation.lon
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.location_name) {
                            setText('current-location', `纬度: ${currentLocation.lat.toFixed(4)}, 经度: ${currentLocation.lon.toFixed(4)}`);
                        }
                        setText('location-city', data.location_name || '-');
                    });
                setText('location-time', formatDateTime(new Date()));

                // 启用按钮
                enableButtons();

                // 获取天气数据
                getWeatherData(currentLocation.lat, currentLocation.lon);
            },
            function (error) {
                console.error("位置获取失败:", error);

                let errorMessage = "无法获取位置信息: ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "用户拒绝了位置访问权限";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "位置信息不可用";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "获取位置超时";
                        break;
                    default:
                        errorMessage += "未知错误";
                        break;
                }

                setText('weather-info', errorMessage);
                setText('current-location', "获取失败");

                // 即使位置获取失败，也启用部分按钮用于测试
                enableBasicButtons();
            }
        );
    } else {
        console.error("浏览器不支持地理位置API");
        setText('weather-info', "您的浏览器不支持地理位置功能");
        setText('current-location', "不支持");

        // 启用基本按钮用于测试
        enableBasicButtons();
    }
}

// 启用所有按钮
function enableButtons() {
    setDisabled('get-advice-btn', false);
    setDisabled('start-scheduler-btn', false);
    setDisabled('stop-scheduler-btn', false);
    setDisabled('show-history-btn', false);
    console.log("所有按钮已启用");
}

// 启用基本按钮（即使位置获取失败）
function enableBasicButtons() {
    setDisabled('get-advice-btn', false);
    setDisabled('show-history-btn', false);
    console.log("基本按钮已启用");
}

// 获取天气数据
function getWeatherData(lat, lon) {
    console.log("获取天气数据:", lat, lon);

    // 显示加载状态
    setText('weather-info', "正在获取天气数据...");

    fetch('/get_weather', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            lat: lat,
            lon: lon
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateWeatherDisplay(data, '手动更新');
                console.log("天气数据获取成功");
            } else {
                throw new Error(data.error || '获取天气数据失败');
            }
        })
        .catch(error => {
            console.error('获取天气数据失败:', error);
            setText('weather-info', `获取天气数据失败: ${error.message}`);
        });
}

// 更新天气显示
function updateWeatherDisplay(data, sourceType = '手动更新') {
    currentWeatherData = data.weather;
    currentRecordId = data.record_id;

    // 取当前天气数据和时区
    const weather = data.weather.current;
    const timezone = data.weather.timezone;

    // 动态设置标签栏图标为当前天气图标
    if (weather.weather && weather.weather[0] && weather.weather[0].icon) {
        const iconId = weather.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconId}.png`;
        const favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = iconUrl;
        }
    }

    setHTML('weather-info', `
        <div>🌡️ 温度: ${Number(weather.temp).toFixed(1)}°C (体感 ${Number(weather.feels_like).toFixed(1)}°C)</div>
        <div>💧 湿度: ${weather.humidity}%</div>
        <div>🌤️ 天气: ${weather.weather[0].description}</div>
        <div>🌬️ 风速: ${weather.wind_speed} m/s</div>
        <div>📊 气压: ${weather.pressure} hPa</div>
        <div>📍 时区: ${timezone}</div>
    `);
    setText('last-update', formatDateTime(new Date()));
    setText('update-source', sourceType);

    // 更新预警信息（始终显示）
    if (data.alerts && data.alerts.length > 0) {
        setText('alerts-info', data.alerts.join('\n\n'));
        setText('alerts-count', data.alerts.length);
    } else {
        setText('alerts-info', '暂无预警信息');
        setText('alerts-count', '0');
    }

    console.log("天气显示更新完成");
    console.log("后端返回的天气数据：", weather);
}

// 自动刷新天气和AI建议
function autoUpdateWeatherAndAdvice() {
    if (!currentLocation) return;

    // 保存上一次天气数据
    previousWeatherData = currentWeatherData;

    // 获取最新天气数据
    fetch('/get_weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lat: currentLocation.lat,
            lon: currentLocation.lon
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateWeatherDisplay(data, '自动更新');
                currentWeatherData = data.weather;
                currentRecordId = data.record_id;

                // 自动请求AI建议（非强制，让AI判断是否需要新建议）
                fetch('/get_advice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        weather_data: currentWeatherData,
                        last_update_weather_data: lastUpdateWeatherData,
                        previous_weather_data: previousWeatherData,
                        record_id: currentRecordId,
                        force_update: false
                    })
                })
                    .then(response => response.json())
                    .then(adviceData => {
                        // 1. 记录自动建议请求时间（无论AI是否需要建议）
                        const now = new Date();
                        setText('last-auto-update', '最后自动更新: ' + formatDateTime(now));

                        // 2. 如果AI需要更新建议，渲染建议内容
                        if (adviceData.success && adviceData.need_update) {
                            setHTML('advice-info', marked.parse(adviceData.advice || '暂无建议'));
                            setText('advice-update-type', '自动更新');
                            setText('advice-update-time', formatDateTime(now));
                            lastUpdateWeatherData = currentWeatherData;
                        }
                        // 如果 AI 说不需要更新建议，则只刷刷新最后自动更新时间
                    })
                    .catch(error => {
                        console.error('自动获取AI建议失败:', error);
                        setText('advice-info', `自动获取建议失败: ${error.message}`);
                    });
            }
        })
        .catch(error => {
            console.error('自动获取天气数据失败:', error);
            setText('weather-info', `自动获取天气数据失败: ${error.message}`);
        });
}

// 获取AI建议（手动）
function getAdvice() {
    if (!currentWeatherData) {
        alert('请等待天气数据加载完成');
        return;
    }

    console.log("用户请求AI建议");

    const button = document.getElementById('get-advice-btn');
    if (button) {
        button.disabled = true;
        button.textContent = '生成中...';
    }

    setText('advice-info', 'AI正在生成建议...');

    fetch('/get_advice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            weather_data: currentWeatherData,
            last_update_weather_data: lastUpdateWeatherData,
            previous_weather_data: previousWeatherData,
            record_id: currentRecordId,
            force_update: true
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 只用 setHTML 渲染建议内容
                console.log('手动建议内容:', data.advice);
                console.log('手动建议HTML:', marked.parse(data.advice || '暂无建议'));
                setHTML('advice-info', marked.parse(data.advice || '暂无建议'));
                setText('advice-update-type', '手动更新');
                setText('advice-update-time', formatDateTime(new Date()));
                lastUpdateWeatherData = currentWeatherData;
                console.log("AI建议获取成功");
            } else {
                throw new Error(data.error || '生成建议失败');
            }
        })
        .catch(error => {
            console.error('获取AI建议失败:', error);
            setText('advice-info', `获取建议失败: ${error.message}`);
        })
        .finally(() => {
            if (button) {
                button.disabled = false;
                button.textContent = '💬 给我点建议';
            }
        });
}

// 定时更新控制
function startScheduler() {
    if (!currentLocation) {
        alert('请等待位置信息获取完成');
        return;
    }

    const interval = parseInt(document.getElementById('update-interval').value);
    if (isNaN(interval) || interval < 30 || interval > 3600) {
        alert('请输入有效的更新间隔（30-3600秒）');
        return;
    }

    console.log("启动定时更新");

    fetch('/start_scheduler', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            lat: currentLocation.lat,
            lon: currentLocation.lon,
            interval: interval
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateSchedulerStatus(true);
                console.log("定时更新启动成功");

                // 新增：定时自动刷新天气和建议
                if (autoUpdateTimer) clearInterval(autoUpdateTimer);
                autoUpdateTimer = setInterval(() => {
                    autoUpdateWeatherAndAdvice();
                }, interval * 1000); // interval是秒，定时器需要毫秒
            } else {
                throw new Error(data.error || '启动定时更新失败');
            }
        })
        .catch(error => {
            console.error('启动定时更新失败:', error);
            alert(`启动定时更新失败: ${error.message}`);
        });
}

// 停止定时更新
function stopScheduler() {
    console.log("停止定时更新");
    if (autoUpdateTimer) {
        clearInterval(autoUpdateTimer);
        autoUpdateTimer = null;
    }
    fetch('/stop_scheduler', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateSchedulerStatus(false);
                console.log("定时更新停止成功");
            } else {
                throw new Error(data.error || '停止定时更新失败');
            }
        })
        .catch(error => {
            console.error('停止定时更新失败:', error);
            alert(`停止定时更新失败: ${error.message}`);
        });
}

// 设置自动更新间隔
function setUpdateInterval() {
    const interval = parseInt(document.getElementById('update-interval').value);
    if (isNaN(interval) || interval < 30 || interval > 3600) {
        alert('请输入有效的更新间隔（30-3600秒）');
        return;
    }

    console.log("设置更新间隔:", interval);
    alert(`更新间隔已设置为 ${interval} 秒`);
}

// 更新定时器状态
function updateSchedulerStatus(active) {
    schedulerActive = active;
    setText('scheduler-status', active ? '运行中' : '未启动');
    const statusElement = document.getElementById('scheduler-status');
    if (statusElement) {
        statusElement.className = active ? 'status-on' : 'status-off';
    }
    setDisabled('start-scheduler-btn', active);
    setDisabled('stop-scheduler-btn', !active);
}

// 手动刷新天气
function refreshWeather() {
    if (!currentLocation) {
        alert('请等待位置信息获取完成');
        return;
    }

    console.log("手动刷新天气");
    getWeatherData(currentLocation.lat, currentLocation.lon);
}

// 历史记录功能
function toggleHistory() {
    const historyCard = document.getElementById('history-card');
    const showHistoryBtn = document.getElementById('show-history-btn');

    if (historyCard && showHistoryBtn) {
        if (historyCard.style.display === 'none') {
            historyCard.style.display = 'block';
            showHistoryBtn.textContent = '📜 隐藏历史记录';
            loadHistory();
        } else {
            historyCard.style.display = 'none';
            showHistoryBtn.textContent = '📜 查看历史记录';
        }
    }
}

// 加载历史记录
function loadHistory() {
    if (!currentLocation) {
        alert('请等待位置信息获取完成');
        return;
    }

    const limit = document.getElementById('history-limit').value;
    console.log("加载历史记录");

    setText('history-info', '加载中...');

    fetch('/get_history', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            lat: currentLocation.lat,
            lon: currentLocation.lon,
            limit: parseInt(limit)
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayHistory(data.history);
            } else {
                throw new Error(data.error || '加载历史记录失败');
            }
        })
        .catch(error => {
            console.error('加载历史记录失败:', error);
            setText('history-info', `加载失败: ${error.message}`);
        });
}

// 显示历史记录
function displayHistory(history) {
    const historyInfo = document.getElementById('history-info');

    if (!historyInfo) return;

    if (!history || history.length === 0) {
        historyInfo.innerHTML = '<div class="history-item">暂无历史记录</div>';
        return;
    }

    let html = '';
    history.forEach(record => {
        html += `
        <div class="history-item">
            <div class="history-time">📅 ${record.timestamp}</div>
            <div class="history-content">${record.formatted}</div>
        </div>
        `;
    });

    historyInfo.innerHTML = html;
}

// API测试功能
function testAPI() {
    console.log("测试API连接...");

    fetch('/get_weather', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            lat: 39.9042,  // 北京纬度
            lon: 116.4074  // 北京经度
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("API测试成功");
                alert("后端API连接正常！");
            } else {
                console.error("API测试失败:", data.error);
                alert(`API连接失败: ${data.error}`);
            }
        })
        .catch(error => {
            console.error("API测试错误:", error);
            alert(`API连接错误: ${error.message}`);
        });
}

// 时间格式化
function formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}

// 工具函数：安全设置文本内容
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// 工具函数：安全设置HTML内容
function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// 工具函数：安全设置按钮禁用状态
function setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
}

// 添加测试按钮到控制台
console.log("天气AI助手前端脚本已加载");
console.log("输入 testAPI() 来测试后端连接");