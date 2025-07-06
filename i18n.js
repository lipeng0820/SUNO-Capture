// Internationalization module for SUNO Capture
class I18n {
  constructor() {
    this.currentLanguage = 'zh'; // Default to Chinese
    this.translations = {
      zh: {
        // Tab names
        'single.download': '单作品下载',
        'batch.download': '批量下载',
        
        // Buttons
        'delete.all': '全部删除',
        'download.all.mp3': '下载所有MP3',
        'download.all.wav': '下载所有WAV',
        'pause': '暂停',
        'resume': '继续',
        'clear.queue': '清空队列',
        
        // Headers and labels
        'download.progress': '下载进度',
        'download.list': '下载列表',
        'batch.download.current.page': '批量下载当前页面作品',
        'download.queue': '等待下载队列',
        
        // Table headers
        'filename': '文件名',
        'size': '大小',
        'status': '状态',
        'actions': '操作',
        
        // Status messages
        'ready': '就绪',
        'downloading': '下载中',
        'completed': '已完成',
        'error': '错误',
        'paused': '已暂停',
        'waiting': '等待中',
        
        // Error messages
        'wav.not.found': '该曲目没有找到对应的WAV版本',
        'file.not.found': '文件不存在',
        'download.interrupted': '下载中断',
        'download.failed': '下载失败',
        
        // Toast messages
        'download.started': '开始下载',
        'download.completed': '下载完成！',
        'download.error': '下载失败',
        
        // Language toggle
        'language': '语言',
        'switch.to.english': '切换到英文',
        'switch.to.chinese': '切换到中文'
      },
      en: {
        // Tab names
        'single.download': 'Single Download',
        'batch.download': 'Batch Download',
        
        // Buttons
        'delete.all': 'Delete All',
        'download.all.mp3': 'Download All MP3',
        'download.all.wav': 'Download All WAV',
        'pause': 'Pause',
        'resume': 'Resume',
        'clear.queue': 'Clear Queue',
        
        // Headers and labels
        'download.progress': 'Download Progress',
        'download.list': 'Download List',
        'batch.download.current.page': 'Batch Download Current Page Works',
        'download.queue': 'Download Queue',
        
        // Table headers
        'filename': 'Filename',
        'size': 'Size',
        'status': 'Status',
        'actions': 'Actions',
        
        // Status messages
        'ready': 'Ready',
        'downloading': 'Downloading',
        'completed': 'Completed',
        'error': 'Error',
        'paused': 'Paused',
        'waiting': 'Waiting',
        
        // Error messages
        'wav.not.found': 'WAV version not found for this track',
        'file.not.found': 'File not found',
        'download.interrupted': 'Download interrupted',
        'download.failed': 'Download failed',
        
        // Toast messages
        'download.started': 'Download started',
        'download.completed': 'Download completed!',
        'download.error': 'Download failed',
        
        // Language toggle
        'language': 'Language',
        'switch.to.english': 'Switch to English',
        'switch.to.chinese': 'Switch to Chinese'
      }
    };
    
    this.init();
  }
  
  init() {
    // Load saved language preference
    chrome.storage.local.get(['language'], (result) => {
      if (result.language) {
        this.currentLanguage = result.language;
      }
    });
  }
  
  // Get translation for a key
  t(key) {
    const translation = this.translations[this.currentLanguage];
    if (!translation) {
      console.error(`Translation not found for language: ${this.currentLanguage}`);
      return key;
    }
    
    const value = translation[key];
    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    
    return value;
  }
  
  // Set language and save preference
  setLanguage(language) {
    if (!this.translations[language]) {
      console.error(`Language not supported: ${language}`);
      return;
    }
    
    this.currentLanguage = language;
    
    // Save preference
    chrome.storage.local.set({ language: language });
    
    // Notify other parts of the extension
    chrome.runtime.sendMessage({
      type: 'languageChanged',
      language: language
    });
    
    // Update UI if popup is open
    this.updateUI();
  }
  
  // Toggle between languages
  toggleLanguage() {
    const newLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
    this.setLanguage(newLanguage);
  }
  
  // Get current language
  getCurrentLanguage() {
    return this.currentLanguage;
  }
  
  // Get available languages
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
  
  // Update UI elements with new language
  updateUI() {
    // This will be called by popup.js to update the interface
    const event = new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    });
    document.dispatchEvent(event);
  }
}

// Create global instance
const i18n = new I18n();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
} 