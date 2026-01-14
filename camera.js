/* ============================================
   停车拍照计时App - 相机模块
   Agent 2: 拍照模块工程师
   ============================================ */

class CameraModule {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.capturedImage = null;
  }

  /**
   * 初始化相机
   * @param {HTMLVideoElement} videoElement - 用于预览的video元素
   */
  async init(videoElement) {
    this.videoElement = videoElement;
    
    try {
      // 请求相机权限，优先使用后置摄像头
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 后置摄像头
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      
      console.log('📷 相机已初始化');
      return true;
    } catch (error) {
      console.error('相机初始化失败:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * 获取用户友好的错误信息
   */
  getErrorMessage(error) {
    if (error.name === 'NotAllowedError') {
      return '相机权限被拒绝，请在浏览器设置中允许访问相机';
    } else if (error.name === 'NotFoundError') {
      return '未找到相机设备';
    } else if (error.name === 'NotReadableError') {
      return '相机被其他应用占用';
    }
    return '无法访问相机';
  }

  /**
   * 拍照
   * @returns {string} Base64格式的图片数据
   */
  capture() {
    if (!this.videoElement || !this.stream) {
      throw new Error('相机未初始化');
    }

    // 创建canvas进行截图
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);
    
    // 转换为Base64
    this.capturedImage = canvas.toDataURL('image/jpeg', 0.8);
    
    console.log('📸 照片已拍摄');
    return this.capturedImage;
  }

  /**
   * 停止相机
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      console.log('📷 相机已关闭');
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * 保存照片到本地存储
   * @param {string} imageData - Base64图片数据
   * @param {number} timestamp - 时间戳
   */
  saveToStorage(imageData, timestamp) {
    const storageKey = 'parking_photo';
    const photoData = {
      image: imageData,
      timestamp: timestamp,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(photoData));
    console.log('💾 照片已保存');
  }

  /**
   * 从本地存储加载照片
   * @returns {Object|null} 照片数据
   */
  loadFromStorage() {
    const storageKey = 'parking_photo';
    const data = localStorage.getItem(storageKey);
    
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('加载照片失败:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * 清除存储的照片
   */
  clearStorage() {
    localStorage.removeItem('parking_photo');
    this.capturedImage = null;
    console.log('🗑️ 照片已清除');
  }

  /**
   * 检查相机是否可用
   */
  static async isAvailable() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (e) {
      return false;
    }
  }
}

// 导出模块
window.CameraModule = CameraModule;
