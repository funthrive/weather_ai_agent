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
                setText('current-location', `纬度: ${currentLocation.lat.toFixed(4)}, 经度: ${currentLocation.lon.toFixed(4)}`);
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
                enableButtons();
                getWeatherData(currentLocation.lat, currentLocation.lon);
            },
            function (error) {
                // 统一处理所有定位失败情况，自动填充厦门
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
                setText('weather-info', errorMessage + '，已自动使用默认位置厦门');
                setText('current-location', "默认：厦门");
                setText('location-city', '厦门');
                setText('location-time', formatDateTime(new Date()));
                currentLocation = { lat: 24.4798, lon: 118.0894 };
                enableButtons();
                getWeatherData(currentLocation.lat, currentLocation.lon);
            }
        );
    } else {
        console.error("浏览器不支持地理位置API");
        setText('weather-info', "您的浏览器不支持地理位置功能，已自动使用默认位置厦门");
        setText('current-location', "默认：厦门");
        setText('location-city', '厦门');
        setText('location-time', formatDateTime(new Date()));
        currentLocation = { lat: 24.4798, lon: 118.0894 };
        enableButtons();
        getWeatherData(currentLocation.lat, currentLocation.lon);
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
function getWeatherData(lat, lon, sourceType = '手动更新') {
    getWeatherDataWithRetry(lat, lon, 0, sourceType);
}

function getWeatherDataWithRetry(lat, lon, retryCount, sourceType = '手动更新') {
    console.log("获取天气数据:", lat, lon, `重试次数: ${retryCount}`);
    if (retryCount === 0) {
        setText('weather-info', "正在获取天气数据...");
    }
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
                updateWeatherDisplay(data, sourceType);
                console.log("天气数据获取成功");
            } else {
                throw new Error(data.error || '获取天气数据失败');
            }
        })
        .catch(error => {
            if (retryCount < 4) {
                setText('weather-info', `请求失败，正在重试第${retryCount + 1}次...`);
                setTimeout(() => getWeatherDataWithRetry(lat, lon, retryCount + 1, sourceType), 2000);
            } else {
                setText('weather-info', `获取天气数据失败: ${error.message}`);
                console.error('获取天气数据失败:', error);
            }
        });
}

// 更新天气显示
function updateWeatherDisplay(data, sourceType = '手动更新') {
    currentWeatherData = data.weather;
    currentRecordId = data.record_id;

    // 获取当前天气数据
    const weather = data.weather.current;
    const timezone = data.weather.timezone;

    // 个性化标签栏图标为当前天气图标
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

    // 预警信息模块动画显示/隐藏
    const alertsCard = document.getElementById('alerts-card');
    const hasAlerts = data.alerts && data.alerts.length > 0;

    if (alertsCard) {
        if (hasAlerts) {
            setText('alerts-info', data.alerts.join('\n\n'));
            setText('alerts-count', data.alerts.length);

            // 显示并动画
            alertsCard.style.display = 'block';
            alertsCard.classList.add('alert-fade-in');
            setTimeout(() => {
                alertsCard.classList.remove('alert-fade-in');
            }, 800);
        } else {
            // 动画隐藏
            alertsCard.classList.add('alert-fade-out');
            setTimeout(() => {
                alertsCard.classList.remove('alert-fade-out');
                alertsCard.style.display = 'none';
            }, 800);
        }
    }

    console.log("天气显示更新完成");
    console.log("后端返回的天气数据：", weather);
}

// 自动刷新天气和AI建议
function autoUpdateWeatherAndAdvice() {
    if (!currentLocation) return;
    previousWeatherData = currentWeatherData;
    getWeatherDataWithRetry(currentLocation.lat, currentLocation.lon, 0, '自动更新');
    setTimeout(() => {
        getAdviceWithRetry(currentWeatherData, lastUpdateWeatherData, previousWeatherData, currentRecordId, false, 0);
    }, 1000);
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
    getAdviceWithRetry(currentWeatherData, lastUpdateWeatherData, previousWeatherData, currentRecordId, true, 0, button);
}

function getAdviceWithRetry(weatherData, lastUpdateWeatherData, previousWeatherData, recordId, forceUpdate, retryCount, button) {
    fetch('/get_advice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            weather_data: weatherData,
            last_update_weather_data: lastUpdateWeatherData,
            previous_weather_data: previousWeatherData,
            record_id: recordId,
            force_update: forceUpdate
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // 自动更新时，只有收到AI响应时才刷新自动更新时间
            if (!forceUpdate) {
                const now = new Date();
                setText('last-auto-update', '最后自动更新: ' + formatDateTime(now));
            }
            if (data.success) {
                setHTML('advice-info', marked.parse(data.advice || '暂无建议'));
                setText('advice-update-type', forceUpdate ? '手动更新' : '自动更新');
                setText('advice-update-time', formatDateTime(new Date()));
                lastUpdateWeatherData = weatherData;
                if (button) {
                    button.disabled = false;
                    button.textContent = '💬 给我点建议';
                }
                console.log("AI建议获取成功");
            } else {
                throw new Error(data.error || '生成建议失败');
            }
        })
        .catch(error => {
            if (retryCount < 4) {
                setText('advice-info', `建议请求失败，正在重试第${retryCount + 1}次...`);
                setTimeout(() => getAdviceWithRetry(weatherData, lastUpdateWeatherData, previousWeatherData, recordId, forceUpdate, retryCount + 1, button), 2000);
            } else {
                setText('advice-info', `获取建议失败: ${error.message}`);
                if (button) {
                    button.disabled = false;
                    button.textContent = '💬 给我点建议';
                }
                console.error('获取AI建议失败:', error);
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
    if (autoUpdateTimer) clearInterval(autoUpdateTimer);
    autoUpdateTimer = setInterval(() => {
        autoUpdateWeatherAndAdvice();
    }, interval * 1000); // interval是秒，定时器需要毫秒
    //updateSchedulerStatus(true);
    alert(`定时天气更新已启动，间隔: ${interval}秒`);
    setText('scheduler-status', '运行中');
    const statusElement = document.getElementById('scheduler-status');
    if (statusElement) statusElement.className = 'status-on';
    setDisabled('start-scheduler-btn', true);
    setDisabled('stop-scheduler-btn', false);
    /*已完全迁移至前端，无需调用后端
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
    */
}

// 停止定时更新
function stopScheduler() {

    console.log("停止定时更新");
    if (autoUpdateTimer) {
        clearInterval(autoUpdateTimer);
        autoUpdateTimer = null;
    }
    //updateSchedulerStatus(false);
    alert('定时天气更新已停止');
    setText('scheduler-status', '未启动');
    const statusElement = document.getElementById('scheduler-status');
    if (statusElement) statusElement.className = 'status-off';
    setDisabled('start-scheduler-btn', false);
    setDisabled('stop-scheduler-btn', true);
    /*已完全迁移至前端，无需调用后端
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
        */
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

/*功能已完全迁移至前端
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
*/

// 手动刷新天气
function refreshWeather() {
    if (!currentLocation) {
        alert('请等待位置信息获取完成');
        return;
    }

    console.log("手动刷新天气");
    getWeatherData(currentLocation.lat, currentLocation.lon, '手动更新');
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
            <div class="history-time">📅 ${formatDateTimeWithTimezone(record.timestamp, record.timezone)}</div>
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

// 按时区格式化时间（用于历史记录）
function formatDateTimeWithTimezone(date, timezone) {
    const d = date instanceof Date ? date : new Date(date);
    try {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: timezone || 'Asia/Shanghai'
        }).format(d);
    } catch (e) {
        return formatDateTime(d); // 回退
    }
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