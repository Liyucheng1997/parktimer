/* ============================================
   停车拍照计时App - 计时模块
   Agent 3: 计时模块工程师
   ============================================ */

class TimerModule {
    constructor() {
        this.startTime = null;
        this.intervalId = null;
        this.onTick = null;
        this.onHourApproaching = null;
        this.lastNotifiedHour = 0;
        this.warningMinutes = 5; // 提前5分钟提醒
    }

    /**
     * 开始计时
     * @param {number} startTime - 可选，恢复计时时传入之前的开始时间
     */
    start(startTime = null) {
        this.startTime = startTime || Date.now();
        this.lastNotifiedHour = 0;

        // 保存到本地存储
        this.saveToStorage();

        // 每秒更新
        this.intervalId = setInterval(() => this.tick(), 1000);

        console.log('⏱️ 计时开始:', new Date(this.startTime).toLocaleString());

        // 立即执行一次更新
        this.tick();
    }

    /**
     * 每秒更新
     */
    tick() {
        if (!this.startTime) return;

        const elapsed = this.getElapsedTime();
        const formatted = this.formatTime(elapsed);
        const nextHourInfo = this.getNextHourInfo(elapsed);

        // 回调更新UI
        if (this.onTick) {
            this.onTick({
                elapsed,
                formatted,
                nextHourInfo
            });
        }

        // 检查是否需要发送整点提醒
        this.checkHourWarning(elapsed, nextHourInfo);
    }

    /**
     * 获取已过时间（毫秒）
     */
    getElapsedTime() {
        if (!this.startTime) return 0;
        return Date.now() - this.startTime;
    }

    /**
     * 格式化时间显示
     * @param {number} ms - 毫秒数
     * @returns {string} 格式化的时间字符串 HH:MM:SS
     */
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return [hours, minutes, seconds]
            .map(v => v.toString().padStart(2, '0'))
            .join(':');
    }

    /**
     * 获取下一个整点信息
     * @param {number} elapsed - 已过时间（毫秒）
     */
    getNextHourInfo(elapsed) {
        const totalMinutes = Math.floor(elapsed / 60000);
        const currentHour = Math.floor(totalMinutes / 60);
        const minutesIntoHour = totalMinutes % 60;
        const minutesToNextHour = 60 - minutesIntoHour;

        // 下一个整点是第几小时
        const nextHour = currentHour + 1;

        // 距离下一整点的剩余秒数
        const secondsIntoMinute = Math.floor((elapsed / 1000) % 60);
        const secondsToNextHour = (minutesToNextHour * 60) - secondsIntoMinute;

        // 格式化剩余时间
        const remainingMinutes = Math.floor(secondsToNextHour / 60);
        const remainingSeconds = secondsToNextHour % 60;
        const formattedRemaining = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        return {
            currentHour,
            nextHour,
            minutesToNextHour: remainingMinutes,
            secondsToNextHour,
            formattedRemaining,
            isUrgent: remainingMinutes < this.warningMinutes
        };
    }

    /**
     * 检查是否需要发送整点提醒
     */
    checkHourWarning(elapsed, nextHourInfo) {
        // 如果距离整点还有warningMinutes分钟，且这个小时还没提醒过
        if (nextHourInfo.minutesToNextHour <= this.warningMinutes &&
            nextHourInfo.minutesToNextHour > 0 &&
            nextHourInfo.nextHour > this.lastNotifiedHour) {

            this.lastNotifiedHour = nextHourInfo.nextHour;

            if (this.onHourApproaching) {
                this.onHourApproaching(nextHourInfo);
            }

            console.log(`⚠️ 即将到达第 ${nextHourInfo.nextHour} 小时，剩余 ${nextHourInfo.minutesToNextHour} 分钟`);
        }
    }

    /**
     * 停止计时
     * @returns {Object} 停车摘要
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        const elapsed = this.getElapsedTime();
        const summary = {
            startTime: this.startTime,
            endTime: Date.now(),
            elapsed,
            formatted: this.formatTime(elapsed),
            hours: Math.ceil(elapsed / 3600000) // 向上取整计算小时数
        };

        console.log('⏱️ 计时结束:', summary);

        // 清除存储
        this.clearStorage();
        this.startTime = null;
        this.lastNotifiedHour = 0;

        return summary;
    }

    /**
     * 保存到本地存储
     */
    saveToStorage() {
        const data = {
            startTime: this.startTime,
            lastNotifiedHour: this.lastNotifiedHour
        };
        localStorage.setItem('parking_timer', JSON.stringify(data));
    }

    /**
     * 从本地存储恢复
     * @returns {boolean} 是否成功恢复
     */
    restoreFromStorage() {
        const data = localStorage.getItem('parking_timer');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.startTime) {
                    this.startTime = parsed.startTime;
                    this.lastNotifiedHour = parsed.lastNotifiedHour || 0;

                    // 重新启动计时器
                    this.intervalId = setInterval(() => this.tick(), 1000);
                    this.tick();

                    console.log('⏱️ 计时已恢复:', new Date(this.startTime).toLocaleString());
                    return true;
                }
            } catch (e) {
                console.error('恢复计时失败:', e);
            }
        }
        return false;
    }

    /**
     * 清除本地存储
     */
    clearStorage() {
        localStorage.removeItem('parking_timer');
    }

    /**
     * 获取开始时间的格式化字符串
     */
    getStartTimeFormatted() {
        if (!this.startTime) return '';
        return new Date(this.startTime).toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 检查是否正在计时
     */
    isRunning() {
        return this.startTime !== null && this.intervalId !== null;
    }
}

// 导出模块
window.TimerModule = TimerModule;
