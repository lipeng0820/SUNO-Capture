// 监听页面加载完成
window.addEventListener('load', function() {
  // 检查是否在音乐页面或创作列表页面
  if (window.location.href.includes('suno.com/song/')) {
    console.log('SUNO Capture: 检测到音乐页面');
    // 延迟添加按钮，确保页面元素已加载
    setTimeout(addDownloadButtons, 2000);
  } else if (window.location.href.includes('suno.com/create')) {
    console.log('SUNO Capture: 检测到创作列表页面');
    // 延迟添加批量下载按钮，确保页面元素已加载
    setTimeout(addBatchDownloadButtons, 2000);
    
    // 监听URL变化（处理翻页情况）
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('SUNO Capture: 检测到URL变化，可能是翻页操作');
        setTimeout(addBatchDownloadButtons, 2000);
      }
    });
    observer.observe(document, {subtree: true, childList: true});
  }
});

// 添加下载按钮
function addDownloadButtons() {
  // 获取音乐UUID
  const musicUuid = extractMusicUuid();
  if (!musicUuid) {
    console.error('SUNO Capture: 无法提取音乐UUID');
    return;
  }
  
  console.log('SUNO Capture: 提取到音乐UUID:', musicUuid);
  
  // 查找目标区域 - 播放按钮所在的容器
  const buttonContainer = document.querySelector('.flex-1.flex.flex-row.items-center.justify-start.gap-2');
  if (!buttonContainer) {
    console.error('SUNO Capture: 无法找到按钮容器');
    return;
  }
  
  // 移除已存在的下载按钮（如果有）
  const existingButtons = document.querySelector('.suno-capture-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }
  
  // 创建下载按钮容器
  const downloadContainer = document.createElement('div');
  downloadContainer.className = 'suno-capture-buttons';
  downloadContainer.style.display = 'inline-flex';
  downloadContainer.style.marginLeft = '4px';
  
  // 获取页面上现有按钮的样式
  const existingButton = buttonContainer.querySelector('button');
  if (!existingButton) {
    console.error('SUNO Capture: 无法找到现有按钮样式');
    return;
  }
  
  // 创建MP3下载按钮
  const mp3Button = document.createElement('button');
  mp3Button.type = 'button';
  mp3Button.className = existingButton.className;
  mp3Button.style.marginLeft = '4px';
  
  // 创建内部span和文本
  const mp3Span = document.createElement('span');
  mp3Span.className = existingButton.querySelector('span').className;
  mp3Span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-current flex-shrink-0 w-4 h-4 m-1 mx-0"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>MP3';
  mp3Button.appendChild(mp3Span);
  
  // 创建WAV下载按钮
  const wavButton = document.createElement('button');
  wavButton.type = 'button';
  wavButton.className = existingButton.className;
  wavButton.style.marginLeft = '4px';
  
  // 创建内部span和文本
  const wavSpan = document.createElement('span');
  wavSpan.className = existingButton.querySelector('span').className;
  wavSpan.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" class="text-current flex-shrink-0 w-4 h-4 m-1 mx-0"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>WAV';
  wavButton.appendChild(wavSpan);
  
  // 添加按钮到容器
  downloadContainer.appendChild(mp3Button);
  downloadContainer.appendChild(wavButton);
  
  // 插入按钮容器到页面
  buttonContainer.appendChild(downloadContainer);
  
  // 添加事件监听器
  mp3Button.addEventListener('click', function(e) {
    e.stopPropagation();
    console.log('SUNO Capture: MP3按钮被点击');
    downloadDirectly(musicUuid, 'mp3');
  });
  
  wavButton.addEventListener('click', function(e) {
    e.stopPropagation();
    console.log('SUNO Capture: WAV按钮被点击');
    downloadDirectly(musicUuid, 'wav');
  });
  
  console.log('SUNO Capture: 下载按钮已添加');
}

// 提取音乐UUID
function extractMusicUuid() {
  const match = window.location.href.match(/suno\.com\/song\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

// 直接下载音频文件
function downloadDirectly(musicUuid, type) {
  const url = `https://cdn1.suno.ai/${musicUuid}.${type}`;
  console.log(`SUNO Capture: 准备直接下载 ${type} 文件: ${url}`);
  
  // Get language-specific message
  getDownloadMessage(type).then(message => {
    showDownloadToast(message);
  });
  
  // 使用chrome.downloads API下载文件
  chrome.runtime.sendMessage({
    type: 'downloadDirectly',
    url: url,
    filename: `${musicUuid}.${type}`
  });
}

// Get localized download message
function getDownloadMessage(type) {
  return new Promise((resolve) => {
    // Get current language from storage
    chrome.storage.local.get(['language'], (result) => {
      const language = result.language || 'zh';
      
      if (language === 'en') {
        resolve(`Download started: ${type.toUpperCase()} audio`);
      } else {
        resolve(`开始下载 ${type.toUpperCase()} 音频`);
      }
    });
  });
}

// 显示下载提示
function showDownloadToast(message) {
  // 移除已存在的提示
  const existingToast = document.querySelector('.suno-capture-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 创建提示元素
  const toast = document.createElement('div');
  toast.className = 'suno-capture-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '9999';
  toast.textContent = message;
  
  // 添加到页面
  document.body.appendChild(toast);
  
  // 3秒后移除
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 3000);
}

// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'downloadComplete') {
    getLocalizedMessage('download.completed').then(completeMessage => {
      showDownloadToast(completeMessage);
    });
  } else if (message.type === 'downloadError') {
    getLocalizedMessage('download.error').then(errorMessage => {
      showDownloadToast(errorMessage + ': ' + message.error);
    });
  } else if (message.type === 'triggerBatchDownload') {
    console.log(`SUNO Capture: 收到批量下载请求，类型: ${message.fileType}`);
    batchDownloadMusic(message.fileType);
  }
});

// Get localized message based on current language
function getLocalizedMessage(key) {
  return new Promise((resolve) => {
    // Get current language from storage
    chrome.storage.local.get(['language'], (result) => {
      const language = result.language || 'zh';
      
      const messages = {
        zh: {
          'download.completed': '下载完成！',
          'download.error': '下载失败'
        },
        en: {
          'download.completed': 'Download completed!',
          'download.error': 'Download failed'
        }
      };
      
      const message = messages[language]?.[key] || messages.zh[key] || key;
      resolve(message);
    });
  });
}

// 添加批量下载按钮
function addBatchDownloadButtons() {
  console.log('SUNO Capture: 开始添加批量下载按钮');

  // 移除已存在的批量下载按钮（如果有）
  const existingButtons = document.querySelector('.suno-capture-batch-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }

  // 获取当前语言并设置按钮文本
  chrome.storage.local.get(['language'], (result) => {
    const language = result.language || 'zh';
    let mp3Text = language === 'en' ? 'Download All MP3' : '批量下载MP3';
    let wavText = language === 'en' ? 'Download All WAV' : '批量下载WAV';

    // 创建批量下载按钮容器
    const batchContainer = document.createElement('div');
    batchContainer.className = 'suno-capture-batch-buttons';
    batchContainer.style.position = 'fixed';
    batchContainer.style.bottom = '20px';
    batchContainer.style.right = '20px';
    batchContainer.style.zIndex = '9999';
    batchContainer.style.display = 'flex';
    batchContainer.style.flexDirection = 'column';
    batchContainer.style.gap = '8px';

    // 创建批量下载MP3按钮
    const batchMp3Button = document.createElement('button');
    batchMp3Button.className = 'batch-mp3-btn';
    batchMp3Button.style.backgroundColor = '#2563eb';
    batchMp3Button.style.color = 'white';
    batchMp3Button.style.padding = '8px 12px';
    batchMp3Button.style.borderRadius = '4px';
    batchMp3Button.style.border = 'none';
    batchMp3Button.style.cursor = 'pointer';
    batchMp3Button.style.display = 'flex';
    batchMp3Button.style.alignItems = 'center';
    batchMp3Button.style.justifyContent = 'center';
    batchMp3Button.style.gap = '4px';
    batchMp3Button.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    batchMp3Button.style.transition = 'all 0.2s ease';
    batchMp3Button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>' + mp3Text;

    // 创建批量下载WAV按钮
    const batchWavButton = document.createElement('button');
    batchWavButton.className = 'batch-wav-btn';
    batchWavButton.style.backgroundColor = '#7c3aed';
    batchWavButton.style.color = 'white';
    batchWavButton.style.padding = '8px 12px';
    batchWavButton.style.borderRadius = '4px';
    batchWavButton.style.border = 'none';
    batchWavButton.style.cursor = 'pointer';
    batchWavButton.style.display = 'flex';
    batchWavButton.style.alignItems = 'center';
    batchWavButton.style.justifyContent = 'center';
    batchWavButton.style.gap = '4px';
    batchWavButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    batchWavButton.style.transition = 'all 0.2s ease';
    batchWavButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"></path></svg>' + wavText;

    // 添加按钮到容器
    batchContainer.appendChild(batchMp3Button);
    batchContainer.appendChild(batchWavButton);

    // 添加容器到页面
    document.body.appendChild(batchContainer);

    // 添加悬停和点击效果（原样保留）
    batchMp3Button.addEventListener('mouseover', function() {
      this.style.backgroundColor = '#1d4ed8';
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    batchMp3Button.addEventListener('mouseout', function() {
      this.style.backgroundColor = '#2563eb';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    });
    batchWavButton.addEventListener('mouseover', function() {
      this.style.backgroundColor = '#6d28d9';
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    batchWavButton.addEventListener('mouseout', function() {
      this.style.backgroundColor = '#7c3aed';
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    });
    batchMp3Button.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 3px rgba(0, 0, 0, 0.2)';
    });
    batchMp3Button.addEventListener('mouseup', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    batchWavButton.addEventListener('mousedown', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 3px rgba(0, 0, 0, 0.2)';
    });
    batchWavButton.addEventListener('mouseup', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });
    batchMp3Button.addEventListener('click', function() {
      console.log('SUNO Capture: 批量下载MP3按钮被点击');
      batchDownloadMusic('mp3');
    });
    batchWavButton.addEventListener('click', function() {
      console.log('SUNO Capture: 批量下载WAV按钮被点击');
      batchDownloadMusic('wav');
    });
    console.log('SUNO Capture: 批量下载按钮已添加');
  });
}

// Listen for language change and update batch buttons
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'languageChanged') {
      setTimeout(addBatchDownloadButtons, 100); // Re-render batch buttons
    }
  });
}

// 批量下载音乐
function batchDownloadMusic(fileType) {
  console.log(`SUNO Capture: 开始批量下载 ${fileType} 文件`);
  
  // 查找音乐列表容器 - 尝试多种可能的选择器
  let musicItems = [];
  
  // 尝试查找带有data-clip-id属性的元素
  const itemsWithClipId = document.querySelectorAll('[data-clip-id]');
  if (itemsWithClipId && itemsWithClipId.length > 0) {
    console.log(`SUNO Capture: 找到 ${itemsWithClipId.length} 个带有data-clip-id的元素`);
    musicItems = Array.from(itemsWithClipId);
  } else {
    // 尝试查找其他可能包含音乐ID的元素
    // 1. 尝试查找GridList中的行
    const gridList = document.querySelector('.react-aria-GridList');
    if (gridList) {
      const rows = gridList.querySelectorAll('[role="row"]');
      if (rows && rows.length > 0) {
        console.log(`SUNO Capture: 找到 ${rows.length} 个GridList行元素`);
        musicItems = Array.from(rows);
      }
    }
    
    // 2. 如果还是没找到，尝试查找包含音乐卡片的元素
    if (musicItems.length === 0) {
      const cards = document.querySelectorAll('.music-card, .clip-card, [data-testid*="clip"], [data-testid*="song"]');
      if (cards && cards.length > 0) {
        console.log(`SUNO Capture: 找到 ${cards.length} 个可能的音乐卡片元素`);
        musicItems = Array.from(cards);
      }
    }
  }
  
  if (musicItems.length === 0) {
    const message = typeof i18n !== 'undefined' ? i18n.t('no.music.found') : 'No downloadable music found';
    showDownloadToast(message);
    console.error('SUNO Capture: 未找到可下载的音乐项');
    return;
  }
  
  console.log(`SUNO Capture: 找到 ${musicItems.length} 首音乐`);
  
  // 收集所有音乐UUID
  const musicUuids = [];
  
  // 遍历音乐项，提取UUID
  musicItems.forEach(item => {
    let musicUuid = null;
    
    // 尝试从data-clip-id属性获取
    if (item.dataset && item.dataset.clipId) {
      musicUuid = item.dataset.clipId;
    }
    // 尝试从URL获取
    else if (item.querySelector('a[href*="/song/"]')) {
      const link = item.querySelector('a[href*="/song/"]');
      const match = link.href.match(/\/song\/([a-f0-9-]+)/);
      if (match && match[1]) {
        musicUuid = match[1];
      }
    }
    // 尝试从内部元素的ID获取
    else {
      const idElements = item.querySelectorAll('[id*="clip-"], [id*="song-"]');
      if (idElements.length > 0) {
        const idEl = idElements[0];
        const match = idEl.id.match(/(?:clip|song)-([a-f0-9-]+)/);
        if (match && match[1]) {
          musicUuid = match[1];
        }
      }
    }
    
    if (musicUuid) {
      console.log(`SUNO Capture: 提取到音乐UUID: ${musicUuid}`);
      musicUuids.push(musicUuid);
    }
  });
  
  if (musicUuids.length === 0) {
    const message = typeof i18n !== 'undefined' ? i18n.t('cannot.extract.music.id') : 'Cannot extract music ID';
    showDownloadToast(message);
    console.error('SUNO Capture: 无法提取音乐ID');
    return;
  }
  
  const message = typeof i18n !== 'undefined' ? 
    i18n.t('added.to.download.queue').replace('{count}', musicUuids.length) : 
    `Added ${musicUuids.length} songs to download queue`;
  showDownloadToast(message);
  
  // 设置一个标志，表示用户已启动批量下载
  chrome.storage.local.set({ lastUsedTab: 'batch' });
  
  // 发送批量下载请求到background.js
  chrome.runtime.sendMessage({
    type: 'batchDownloadMusic',
    musicUuids: musicUuids,
    fileType: fileType
  });
}
