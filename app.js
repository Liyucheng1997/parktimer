/* ============================================
   停车拍照计时App - 主逻辑
   调度Agent: 集成所有模块
   ============================================ */

class ParkingApp {
    constructor() {
        this.camera = new CameraModule();
        this.timer = new TimerModule();
        this.notification = new NotificationModule();

        this.isParking = false;
        this.elements = {};

        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 缓存DOM元素
        this.cacheElements();

        // 绑定事件
        this.bindEvents();

        // 检查是否有进行中的停车
        this.checkExistingSession();

        // 请求通知权限
        this.setupNotifications();

        console.log('🅿️ 停车计时App已启动');
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 主界面
            emptyState: document.getElementById('emptyState'),
            parkingState: document.getElementById('parkingState'),

            // 按钮
            startBtn: document.getElementById('startBtn'),
            endBtn: document.getElementById('endBtn'),

            // 计时器
            timerValue: document.getElementById('timerValue'),
            startTimeDisplay: document.getElementById('startTimeDisplay'),

            // 整点提醒
            nextHourAlert: document.getElementById('nextHourAlert'),
            nextHourTime: document.getElementById('nextHourTime'),

            // 照片
            photoPreview: document.getElementById('photoPreview'),
            photoPlaceholder: document.getElementById('photoPlaceholder'),
            photoImage: document.getElementById('photoImage'),
            photoTime: document.getElementById('photoTime'),

            // 相机界面
            cameraModal: document.getElementById('cameraModal'),
            cameraVideo: document.getElementById('cameraVideo'),
            captureBtn: document.getElementById('captureBtn'),
            closeCameraBtn: document.getElementById('closeCameraBtn'),

            // 通知提示
            notificationPrompt: document.getElementById('notificationPrompt'),
            enableNotificationBtn: document.getElementById('enableNotificationBtn'),

            // 结束摘要
            summaryOverlay: document.getElementById('summaryOverlay'),
            summaryDuration: document.getElementById('summaryDuration'),
            summaryHours: document.getElementById('summaryHours'),
            confirmEndBtn: document.getElementById('confirmEndBtn')
        };
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 开始停车
        this.elements.startBtn?.addEventListener('click', () => this.startParking());

        // 结束停车
        this.elements.endBtn?.addEventListener('click', () => this.showEndSummary());
        this.elements.confirmEndBtn?.addEventListener('click', () => this.endParking());

        // 相机控制
        this.elements.captureBtn?.addEventListener('click', () => this.capturePhoto());
        this.elements.closeCameraBtn?.addEventListener('click', () => this.closeCamera());

        // 通知权限
        this.elements.enableNotificationBtn?.addEventListener('click', () => this.requestNotificationPermission());

        // 点击摘要遮罩关闭
        this.elements.summaryOverlay?.addEventListener('click', (e) => {
            if (e.target === this.elements.summaryOverlay) {
                this.closeSummary();
            }
        });
    }

    /**
     * 检查是否有进行中的停车会话
     */
    checkExistingSession() {
        // 尝试恢复计时
        const hasTimer = this.timer.restoreFromStorage();

        if (hasTimer) {
            // 恢复照片
            const photoData = this.camera.loadFromStorage();
            if (photoData) {
                this.showPhoto(photoData.image, photoData.timestamp);
            }

            // 设置计时器回调
            this.setupTimerCallbacks();

            // 切换到停车状态
            this.isParking = true;
            this.showParkingState();

            console.log('📋 已恢复之前的停车会话');
        } else {
            this.showEmptyState();
        }
    }

    /**
     * 设置通知
     */
    async setupNotifications() {
        if (!NotificationModule.isSupported()) {
            this.elements.notificationPrompt?.classList.add('hidden');
            return;
        }

        if (this.notification.hasPermission()) {
            this.elements.notificationPrompt?.classList.add('hidden');
        } else if (Notification.permission === 'denied') {
            this.elements.notificationPrompt?.classList.add('hidden');
        }
    }

    /**
     * 请求通知权限
     */
    async requestNotificationPermission() {
        const granted = await this.notification.requestPermission();
        if (granted) {
            this.elements.notificationPrompt?.classList.add('hidden');
            this.notification.test();
        }
    }

    /**
     * 开始停车
     */
    async startParking() {
        try {
            // 打开相机
            await this.openCamera();
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * 打开相机
     */
    async openCamera() {
        this.elements.cameraModal?.classList.add('active');

        try {
            await this.camera.init(this.elements.cameraVideo);
        } catch (error) {
            this.closeCamera();
            throw error;
        }
    }

    /**
     * 关闭相机
     */
    closeCamera() {
        this.camera.stop();
        this.elements.cameraModal?.classList.remove('active');
    }

    /**
     * 拍照
     */
    capturePhoto() {
        const imageData = this.camera.capture();
        const timestamp = Date.now();

        // 保存照片
        this.camera.saveToStorage(imageData, timestamp);

        // 显示照片
        this.showPhoto(imageData, timestamp);

        // 关闭相机
        this.closeCamera();

        // 开始计时
        this.startTimer();

        // 切换状态
        this.isParking = true;
        this.showParkingState();
    }

    /**
     * 显示照片
     */
    showPhoto(imageData, timestamp) {
        if (this.elements.photoImage) {
            this.elements.photoImage.src = imageData;
            this.elements.photoImage.classList.remove('hidden');
        }

        if (this.elements.photoPlaceholder) {
            this.elements.photoPlaceholder.classList.add('hidden');
        }

        if (this.elements.photoTime) {
            const date = new Date(timestamp);
            this.elements.photoTime.textContent = date.toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * 开始计时
     */
    startTimer() {
        // 设置回调
        this.setupTimerCallbacks();

        // 开始计时
        this.timer.start();

        // 更新开始时间显示
        this.updateStartTimeDisplay();
    }

    /**
     * 设置计时器回调
     */
    setupTimerCallbacks() {
        // 每秒更新
        this.timer.onTick = (data) => {
            this.updateTimerDisplay(data);
        };

        // 整点提醒
        this.timer.onHourApproaching = (hourInfo) => {
            this.notification.sendHourWarning(hourInfo);
        };
    }

    /**
     * 更新计时器显示
     */
    updateTimerDisplay(data) {
        // 更新时间
        if (this.elements.timerValue) {
            this.elements.timerValue.textContent = data.formatted;
        }

        // 更新整点提醒
        if (this.elements.nextHourAlert) {
            this.elements.nextHourAlert.classList.toggle('urgent', data.nextHourInfo.isUrgent);
        }

        if (this.elements.nextHourTime) {
            const text = `第 ${data.nextHourInfo.nextHour} 小时还剩 ${data.nextHourInfo.formattedRemaining}`;
            this.elements.nextHourTime.textContent = text;
        }
    }

    /**
     * 更新开始时间显示
     */
    updateStartTimeDisplay() {
        if (this.elements.startTimeDisplay) {
            this.elements.startTimeDisplay.textContent = this.timer.getStartTimeFormatted();
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.elements.emptyState?.classList.remove('hidden');
        this.elements.parkingState?.classList.add('hidden');
    }

    /**
     * 显示停车状态
     */
    showParkingState() {
        this.elements.emptyState?.classList.add('hidden');
        this.elements.parkingState?.classList.remove('hidden');
        this.updateStartTimeDisplay();
    }

    /**
     * 显示结束摘要
     */
    showEndSummary() {
        const elapsed = this.timer.getElapsedTime();
        const formatted = this.timer.formatTime(elapsed);
        const hours = Math.ceil(elapsed / 3600000);

        if (this.elements.summaryDuration) {
            this.elements.summaryDuration.textContent = formatted;
        }

        if (this.elements.summaryHours) {
            this.elements.summaryHours.textContent = hours;
        }

        this.elements.summaryOverlay?.classList.add('active');
    }

    /**
     * 关闭摘要
     */
    closeSummary() {
        this.elements.summaryOverlay?.classList.remove('active');
    }

    /**
     * 结束停车
     */
    endParking() {
        // 停止计时
        this.timer.stop();

        // 清除照片
        this.camera.clearStorage();

        // 重置状态
        this.isParking = false;

        // 关闭摘要
        this.closeSummary();

        // 重置UI
        this.resetUI();

        // 显示空状态
        this.showEmptyState();

        console.log('🅿️ 停车已结束');
    }

    /**
     * 重置UI
     */
    resetUI() {
        if (this.elements.timerValue) {
            this.elements.timerValue.textContent = '00:00:00';
        }

        if (this.elements.photoImage) {
            this.elements.photoImage.src = '';
            this.elements.photoImage.classList.add('hidden');
        }

        if (this.elements.photoPlaceholder) {
            this.elements.photoPlaceholder.classList.remove('hidden');
        }

        if (this.elements.nextHourAlert) {
            this.elements.nextHourAlert.classList.remove('urgent');
        }
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ParkingApp();
});
