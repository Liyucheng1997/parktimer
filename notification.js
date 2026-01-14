/* ============================================
   停车拍照计时App - 通知模块
   Agent 4: 通知模块工程师
   ============================================ */

class NotificationModule {
    constructor() {
        this.permission = Notification.permission;
        this.soundEnabled = true;
        this.audioContext = null;
    }

    /**
     * 检查通知是否被支持
     */
    static isSupported() {
        return 'Notification' in window;
    }

    /**
     * 请求通知权限
     * @returns {Promise<boolean>} 是否获得权限
     */
    async requestPermission() {
        if (!NotificationModule.isSupported()) {
            console.warn('🔔 此浏览器不支持通知');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            console.log('🔔 通知权限:', result);
            return result === 'granted';
        } catch (e) {
            console.error('请求通知权限失败:', e);
            return false;
        }
    }

    /**
     * 检查是否有通知权限
     */
    hasPermission() {
        return this.permission === 'granted';
    }

    /**
     * 发送通知
     * @param {string} title - 通知标题
     * @param {Object} options - 通知选项
     */
    send(title, options = {}) {
        if (!this.hasPermission()) {
            console.warn('🔔 没有通知权限');
            return null;
        }

        const defaultOptions = {
            icon: '🅿️',
            badge: '🅿️',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // 播放提示音
            if (this.soundEnabled) {
                this.playSound();
            }

            console.log('🔔 通知已发送:', title);
            return notification;
        } catch (e) {
            console.error('发送通知失败:', e);
            return null;
        }
    }

    /**
     * 发送整点提醒
     * @param {Object} hourInfo - 整点信息
     */
    sendHourWarning(hourInfo) {
        const title = '⚠️ 停车即将满 ' + hourInfo.nextHour + ' 小时';
        const body = `还剩 ${hourInfo.minutesToNextHour} 分钟到整点，请及时取车避免超时！`;

        return this.send(title, {
            body,
            tag: 'hour-warning-' + hourInfo.nextHour,
            renotify: true
        });
    }

    /**
     * 播放提示音
     */
    playSound() {
        try {
            // 使用Web Audio API生成提示音
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);

            console.log('🔊 提示音已播放');
        } catch (e) {
            console.warn('播放提示音失败:', e);
        }
    }

    /**
     * 设置声音开关
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    /**
     * 获取权限状态文本
     */
    getPermissionText() {
        switch (this.permission) {
            case 'granted':
                return '已开启';
            case 'denied':
                return '已禁止';
            default:
                return '未设置';
        }
    }

    /**
     * 测试通知
     */
    test() {
        return this.send('🅿️ 通知测试', {
            body: '通知功能正常工作！',
            tag: 'test-notification'
        });
    }
}

// 导出模块
window.NotificationModule = NotificationModule;
