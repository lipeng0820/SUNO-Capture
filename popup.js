// 下载记录存储
let downloadHistory = [];
let activeDownloads = {};

// 批量下载队列
let batchDownloadQueue = [];
let isPaused = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 恢复 Tab 状态，并在完成后显示界面
  chrome.storage.local.get(['activeTab', 'lastUsedTab'], (result) => {
    // 如果有lastUsedTab（表示用户刚刚在页面上点击了批量下载），优先使用它
    const activeTab = result.lastUsedTab || result.activeTab || 'single'; // 默认为 'single'
    switchTab(activeTab, true); // 初始化时保存状态
    
    // 如果是因为lastUsedTab切换的，清除这个标志，这样下次打开就不会自动切换了
    if (result.lastUsedTab) {
      chrome.storage.local.remove(['lastUsedTab']);
    }
    
    // 确保UI在恢复状态后可见，并添加过渡效果
    document.body.style.transition = 'opacity 0.15s ease-in';
    document.body.style.opacity = '1';
  });
  
  loadDownloadHistory();
  loadBatchDownloadQueue();
  updateUI();
  
  // 绑定标签页切换事件
  document.getElementById('singleTabBtn').addEventListener('click', () => switchTab('single'));
  document.getElementById('batchTabBtn').addEventListener('click', () => switchTab('batch'));
  
  // 绑定全部删除按钮事件
  document.getElementById('clearAllBtn').addEventListener('click', clearAllHistory);
  document.getElementById('batchClearAllBtn').addEventListener('click', clearBatchQueue);
  
  // 绑定暂停/继续按钮事件
  document.getElementById('pauseResumeBtn').addEventListener('click', togglePauseResume);
  
  // 绑定语言切换按钮事件
  document.getElementById('languageToggleBtn').addEventListener('click', toggleLanguage);
  
  // 绑定批量下载按钮事件
  document.getElementById('downloadAllMp3Btn').addEventListener('click', () => {
    // 向当前活动标签页发送消息，触发批量下载
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('suno.com/create')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'triggerBatchDownload',
          fileType: 'mp3'
        });
        updateStatus(formatMessage('preparing.batch.download.mp3'));
        // 设置标志，表示用户已启动批量下载
        chrome.storage.local.set({ lastUsedTab: 'batch' });
      } else {
        updateStatus(formatMessage('please.use.on.suno.page'));
      }
    });
  });
  
  document.getElementById('downloadAllWavBtn').addEventListener('click', () => {
    // 向当前活动标签页发送消息，触发批量下载
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('suno.com/create')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'triggerBatchDownload',
          fileType: 'wav'
        });
        updateStatus(formatMessage('preparing.batch.download.wav'));
        // 设置标志，表示用户已启动批量下载
        chrome.storage.local.set({ lastUsedTab: 'batch' });
      } else {
        updateStatus(formatMessage('please.use.on.suno.page'));
      }
    });
  });
  
  // 监听来自background.js的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message);
    if (message.type === 'downloadProgress') {
      updateDownloadProgress(message.downloadId, message.progress, message.fileSize);
    } else if (message.type === 'downloadComplete') {
      completeDownload(message.downloadId);
    } else if (message.type === 'downloadStarted') {
      addNewDownload(message.downloadId, message.filename, message.fileType);
    } else if (message.type === 'downloadError') {
      handleDownloadError(message.downloadId, message.error);
    } else if (message.type === 'batchQueueUpdated') {
      updateBatchQueue(message.queue);
    } else if (message.type === 'batchDownloadPaused') {
      updatePauseResumeButton(true);
    } else if (message.type === 'batchDownloadResumed') {
      updatePauseResumeButton(false);
    } else if (message.type === 'languageChanged') {
      updateLanguageUI();
    }
    updateUI();
  });
  
  // Listen for language change events
  document.addEventListener('languageChanged', (event) => {
    updateLanguageUI();
    updateUIText();
  });
  
  // Initialize language UI
  updateLanguageUI();
  updateUIText();
});

// 加载下载历史
function loadDownloadHistory() {
  chrome.storage.local.get(['downloadHistory', 'activeDownloads'], (result) => {
    console.log('加载下载历史:', result);
    downloadHistory = result.downloadHistory || [];
    activeDownloads = result.activeDownloads || {};
    updateUI();
  });
}

// 加载批量下载队列
function loadBatchDownloadQueue() {
  chrome.storage.local.get(['batchDownloadQueue', 'isPaused'], (result) => {
    console.log('加载批量下载队列:', result);
    batchDownloadQueue = result.batchDownloadQueue || [];
    isPaused = result.isPaused || false;
    updatePauseResumeButton(isPaused);
    updateBatchQueueUI();
  });
}

// Helper function to format i18n messages with placeholders
function formatMessage(key, replacements = {}) {
  if (typeof i18n !== 'undefined') {
    let message = i18n.t(key);
    Object.keys(replacements).forEach(placeholder => {
      message = message.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    return message;
  }
  return key; // Fallback to key if i18n not available
}

// 处理下载错误
function handleDownloadError(downloadId, errorMessage) {
  const download = downloadHistory.find(item => item.id === downloadId);
  if (download) {
    download.status = 'error';
    download.error = errorMessage;
    saveDownloadHistory();
    updateUI();
    const message = formatMessage('download.error.with.filename', {
      filename: download.filename,
      error: errorMessage
    });
    updateStatus(message);
  }
}

// 更新UI
function updateUI() {
  const downloadList = document.getElementById('downloadList');
  
  // 清空列表
  downloadList.innerHTML = '';
  
  if (downloadHistory.length === 0) {
    downloadList.innerHTML = `
      <tr style="color: #6b7280; font-style: italic;">
        <td colspan="4" class="py-6 text-center">
          <div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon-lg mb-2" style="color: #4b5563;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>${typeof i18n !== 'undefined' ? i18n.t('empty.history') : '暂无下载记录'}</span>
            <span class="text-xs mt-1 text-gray-600">${typeof i18n !== 'undefined' ? i18n.t('empty.history.instruction') : '在 SUNO 音乐页面点击下载按钮开始'}</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // 按时间倒序排列
  const sortedHistory = [...downloadHistory].sort((a, b) => b.timestamp - a.timestamp);
  
  // 计算总大小和已下载大小
  let totalSize = 0;
  let downloadedSize = 0;
  
  sortedHistory.forEach(item => {
    if (item.fileSize) {
      totalSize += item.fileSize;
      if (item.status === 'completed') {
        downloadedSize += item.fileSize;
      } else if (item.progress) {
        downloadedSize += (item.fileSize * item.progress / 100);
      }
    }
  });
  
  // 更新总进度条
  const progressPercent = totalSize > 0 ? (downloadedSize / totalSize * 100) : 0;
  document.getElementById('totalProgressBar').style.width = `${progressPercent}%`;
  document.getElementById('downloadedSize').textContent = formatFileSize(downloadedSize);
  document.getElementById('totalSize').textContent = formatFileSize(totalSize);
  
  // 生成下载项
  sortedHistory.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'border-t border-gray-700';
    
    // 状态样式
    let statusColor = '#9ca3af';
    let statusIcon = '';
    let statusText = getStatusText(item.status);
    
    if (item.status === 'loading') {
      statusColor = '#9ca3af';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>`;
      statusText = '加载中';
    } else if (item.status === 'downloading') {
      statusColor = '#60a5fa';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>`;
      statusText = formatProgress(item.progress);
    } else if (item.status === 'completed') {
      statusColor = '#34d399';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>`;
      statusText = '已完成';
    } else if (item.status === 'error') {
      statusColor = '#f87171';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`;
      
      // 检查是否是WAV版本不存在的错误
      if (item.error && item.error.includes('没有找到对应的WAV版本')) {
        statusText = '未找到';
      } else {
        statusText = '错误';
      }
    } else if (item.status === 'canceled') {
      statusColor = '#9ca3af';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>`;
      statusText = '已取消';
    }
    
    // 文件类型标签样式
    const fileTagBg = item.fileType === 'mp3' ? '#1e40af' : '#6d28d9';
    
    // 文件大小显示
    let fileSizeDisplay = formatFileSize(item.fileSize);
    if (item.error && item.error.includes('没有找到对应的WAV版本')) {
      fileSizeDisplay = '0 KB';
    }
    
    row.innerHTML = `
      <td class="px-3 py-2">
        <div class="filename-container">
          <span class="filename-text" title="${item.filename}">${item.filename}</span>
          <span class="file-tag" style="background-color: ${fileTagBg}; color: white;">${item.fileType.toUpperCase()}</span>
        </div>
      </td>
      <td class="px-2 py-2">
        <span class="file-size">${fileSizeDisplay}</span>
      </td>
      <td class="px-2 py-2">
        <div class="status-bar" style="color: ${statusColor};">
          <div class="flex items-center">
            ${statusIcon}
            <span class="status-text">${statusText}</span>
          </div>
        </div>
      </td>
      <td class="px-2 py-2 col-action text-center">
        ${item.status === 'downloading' ? 
          `<button class="cancel-btn btn btn-red btn-icon" data-id="${item.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>` : 
          `<button class="delete-btn btn btn-gray btn-icon" data-id="${item.id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>`
        }
      </td>
    `;
    
    downloadList.appendChild(row);
  });
  
  // 绑定取消按钮事件
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const downloadId = e.currentTarget.dataset.id;
      cancelDownload(downloadId);
    });
  });
  
  // 绑定删除按钮事件
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const downloadId = e.currentTarget.dataset.id;
      deleteDownload(downloadId);
    });
  });
}

// 添加新下载
function addNewDownload(downloadId, filename, fileType) {
  console.log('添加新下载:', downloadId, filename, fileType);
  
  // 检查是否已存在相同ID的下载
  const existingIndex = downloadHistory.findIndex(item => item.id === downloadId);
  if (existingIndex !== -1) {
    downloadHistory.splice(existingIndex, 1);
  }
  
  const newDownload = {
    id: downloadId,
    filename: filename,
    fileType: fileType,
    status: 'downloading',
    progress: 0,
    timestamp: Date.now()
  };
  
  downloadHistory.unshift(newDownload);
  activeDownloads[downloadId] = newDownload;
  
  saveDownloadHistory();
  updateUI();
  updateStatus(formatMessage('download.started.with.filename', { filename }));
}

// 更新下载进度
function updateDownloadProgress(downloadId, progress, fileSize) {
  const download = downloadHistory.find(item => item.id === downloadId);
  if (download) {
    download.progress = progress;
    download.fileSize = fileSize;
    saveDownloadHistory();
    updateUI();
    updateStatus(formatMessage('downloading.with.progress', { 
      filename: download.filename, 
      progress 
    }));
  }
}

// 完成下载
function completeDownload(downloadId) {
  const download = downloadHistory.find(item => item.id === downloadId);
  if (download) {
    download.status = 'completed';
    download.progress = 100;
    delete activeDownloads[downloadId];
    saveDownloadHistory();
    updateUI();
    updateStatus(formatMessage('download.completed.with.filename', { filename: download.filename }));
  }
}

// 取消下载
function cancelDownload(downloadId) {
  chrome.runtime.sendMessage({
    type: 'cancelDownload',
    downloadId: downloadId
  });
  
  const download = downloadHistory.find(item => item.id === downloadId);
  if (download) {
    download.status = 'canceled';
    delete activeDownloads[downloadId];
    saveDownloadHistory();
    updateUI();
    updateStatus(formatMessage('download.canceled.with.filename', { filename: download.filename }));
  }
}

// 删除下载记录
function deleteDownload(downloadId) {
  downloadHistory = downloadHistory.filter(item => item.id !== downloadId);
  saveDownloadHistory();
  updateUI();
  updateStatus(formatMessage('download.record.deleted'));
}

// 清除所有历史记录
function clearAllHistory() {
  // 先取消所有活跃下载
  Object.keys(activeDownloads).forEach(downloadId => {
    chrome.runtime.sendMessage({
      type: 'cancelDownload',
      downloadId: downloadId
    });
  });
  
  downloadHistory = [];
  activeDownloads = {};
  saveDownloadHistory();
  updateUI();
  updateStatus(formatMessage('all.download.records.cleared'));
}

// 保存下载历史到本地存储
function saveDownloadHistory() {
  chrome.storage.local.set({
    downloadHistory: downloadHistory,
    activeDownloads: activeDownloads
  });
}

// 更新状态栏
function updateStatus(message) {
  const statusBar = document.getElementById('statusBar');
  statusBar.textContent = message;
  
  // 添加淡入效果
  statusBar.classList.add('animate-pulse');
  setTimeout(() => {
    statusBar.classList.remove('animate-pulse');
  }, 1000);
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取状态文本
function getStatusText(status) {
  if (typeof i18n !== 'undefined') {
    switch(status) {
      case 'loading': return i18n.t('loading');
      case 'downloading': return i18n.t('downloading');
      case 'completed': return i18n.t('completed');
      case 'error': return i18n.t('error');
      case 'canceled': return i18n.t('canceled');
      default: return status;
    }
  } else {
    // Fallback to Chinese if i18n not available
    switch(status) {
      case 'loading': return '加载中';
      case 'downloading': return '下载中';
      case 'completed': return '已完成';
      case 'error': return '错误';
      case 'canceled': return '已取消';
      default: return status;
    }
  }
}

// 切换标签页
function switchTab(tab, saveState = true) {
  if (saveState) {
    // 保存 Tab 状态
    chrome.storage.local.set({ activeTab: tab });
  }
  
  const singleTab = document.getElementById('singleDownloadTab');
  const batchTab = document.getElementById('batchDownloadTab');
  const singleTabBtn = document.getElementById('singleTabBtn');
  const batchTabBtn = document.getElementById('batchTabBtn');
  
  if (tab === 'single') {
    singleTab.style.display = 'block';
    batchTab.style.display = 'none';
    singleTabBtn.classList.add('tab-active');
    singleTabBtn.style.borderBottom = '2px solid #3b82f6';
    batchTabBtn.classList.remove('tab-active');
    batchTabBtn.style.borderBottom = '2px solid transparent';
  } else {
    singleTab.style.display = 'none';
    batchTab.style.display = 'block';
    singleTabBtn.classList.remove('tab-active');
    singleTabBtn.style.borderBottom = '2px solid transparent';
    batchTabBtn.classList.add('tab-active');
    batchTabBtn.style.borderBottom = '2px solid #7c3aed';
  }
}

// 更新批量下载队列
function updateBatchQueue(queue) {
  batchDownloadQueue = queue;
  updateBatchQueueUI();
}

// 更新批量下载队列UI
function updateBatchQueueUI() {
  const batchDownloadList = document.getElementById('batchDownloadList');
  
  // 如果队列为空，显示空状态
  if (batchDownloadQueue.length === 0) {
    batchDownloadList.innerHTML = `
      <tr style="color: #6b7280; font-style: italic;">
        <td colspan="4" class="py-6 text-center">
          <div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon-lg mb-2" style="color: #4b5563;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>${typeof i18n !== 'undefined' ? i18n.t('empty.queue') : '暂无下载队列'}</span>
            <span class="mt-1" style="font-size: 0.75rem; color: #4b5563;">${typeof i18n !== 'undefined' ? i18n.t('empty.queue.instruction') : '点击"下载所有MP3"或"下载所有WAV"按钮开始'}</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // 按时间倒序排列
  const sortedQueue = [...batchDownloadQueue].sort((a, b) => b.timestamp - a.timestamp);
  
  // 清空列表
  batchDownloadList.innerHTML = '';
  
  // 生成队列项
  sortedQueue.forEach(item => {
    // 状态样式
    let statusHTML = '';
    let statusClass = '';
    let waitingText = typeof i18n !== 'undefined' ? i18n.t('queue.waiting') : '等待中';
    let processingText = typeof i18n !== 'undefined' ? i18n.t('queue.processing') : '处理中';
    let completedText = typeof i18n !== 'undefined' ? i18n.t('queue.completed') : '已完成';
    let errorText = typeof i18n !== 'undefined' ? i18n.t('queue.error') : '错误';
    let notFoundText = typeof i18n !== 'undefined' ? i18n.t('queue.notfound') : '未找到';

    if (item.status === 'waiting') {
      statusHTML = `
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" style="color: #9ca3af;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${waitingText}</span>
        </div>
      `;
      statusClass = 'text-gray-400';
    } else if (item.status === 'processing') {
      statusHTML = `
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1 animate-spin" style="color: #60a5fa;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>${processingText}</span>
        </div>
      `;
      statusClass = 'text-blue-400';
    } else if (item.status === 'completed') {
      statusHTML = `
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" style="color: #34d399;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>${completedText}</span>
        </div>
      `;
      statusClass = 'text-green-400';
    } else if (item.status === 'error') {
      // 检查是否是WAV版本不存在的错误
      let errorDisplayText = errorText;
      if (item.error && item.error.includes('没有找到对应的WAV版本')) {
        errorDisplayText = notFoundText;
      }
      statusHTML = `
        <div class="flex items-center" title="${item.error || (typeof i18n !== 'undefined' ? i18n.t('download.failed') : '下载失败')}">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm mr-1" style="color: #f87171;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${errorDisplayText}</span>
        </div>
      `;
      statusClass = 'text-red-400';
    }
    // 文件类型标签样式
    const fileTagBg = item.fileType === 'mp3' ? '#1e40af' : '#6d28d9';
    const fileTagColor = 'white';
    // 创建行元素
    const row = document.createElement('tr');
    row.className = 'border-t border-gray-700';
    // 设置删除按钮状态 - 已完成项目禁用删除按钮
    const isCompleted = item.status === 'completed';
    const btnClass = isCompleted ? 'btn btn-gray btn-icon' : 'btn btn-red btn-icon';
    // 文件大小显示
    let fileSizeDisplay = '-';
    if (item.error && item.error.includes('没有找到对应的WAV版本')) {
      fileSizeDisplay = '0 KB';
    }
    row.innerHTML = `
      <td class="px-3 py-2">
        <div class="flex items-center">
          <span class="truncate-text" title="${item.musicUuid}">${item.musicUuid}</span>
          <span class="file-tag" style="background-color: ${fileTagBg}; color: ${fileTagColor};">${item.fileType.toUpperCase()}</span>
        </div>
      </td>
      <td class="px-2 py-2">
        <span>${fileSizeDisplay}</span>
      </td>
      <td class="px-2 py-2 ${statusClass}">
        ${statusHTML}
      </td>
      <td class="px-2 py-2 text-center">
        <button class="batch-delete-btn ${btnClass}" data-id="${item.id}" ${isCompleted ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm" style="color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    `;
    batchDownloadList.appendChild(row);
  });
  // 绑定删除按钮事件
  document.querySelectorAll('.batch-delete-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', (e) => {
        const queueItemId = e.currentTarget.dataset.id;
        removeBatchQueueItem(queueItemId);
      });
    }
  });
}

// 切换暂停/继续状态
function togglePauseResume() {
  if (isPaused) {
    chrome.runtime.sendMessage({
      type: 'resumeBatchDownload'
    });
  } else {
    chrome.runtime.sendMessage({
      type: 'pauseBatchDownload'
    });
  }
}

// 更新暂停/继续按钮
function updatePauseResumeButton(paused) {
  isPaused = paused;
  const pauseResumeBtn = document.getElementById('pauseResumeBtn');
  
  if (paused) {
    pauseResumeBtn.textContent = typeof i18n !== 'undefined' ? i18n.t('resume') : '继续';
    pauseResumeBtn.className = 'btn btn-green';
  } else {
    pauseResumeBtn.textContent = typeof i18n !== 'undefined' ? i18n.t('pause') : '暂停';
    pauseResumeBtn.className = 'btn btn-gray';
  }
}

// 清空批量下载队列
function clearBatchQueue() {
  chrome.runtime.sendMessage({
    type: 'clearBatchDownloadQueue'
  });
  updateStatus(formatMessage('batch.queue.cleared'));
}

// 从批量下载队列中移除项目
function removeBatchQueueItem(queueItemId) {
  chrome.runtime.sendMessage({
    type: 'removeBatchDownloadItem',
    queueItemId: queueItemId
  });
  updateStatus(formatMessage('item.removed.from.queue'));
}

// 添加全局函数，使按钮点击事件可以在HTML中调用
window.removeBatchQueueItem = removeBatchQueueItem;

// 向当前标签页发送消息的安全包装函数
function sendMessageToActiveTab(message) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0 && tabs[0].url && 
        (tabs[0].url.includes('suno.com') || tabs[0].url.includes('suno.ai'))) {
      try {
        chrome.tabs.sendMessage(tabs[0].id, message, response => {
          if (chrome.runtime.lastError) {
            console.log('发送消息时出错:', chrome.runtime.lastError.message);
            // 如果是连接问题，显示友好的错误消息
            if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
              updateStatus(formatMessage('cannot.connect.to.suno'));
            }
          }
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        updateStatus(formatMessage('message.send.failed'));
      }
    } else {
      updateStatus(formatMessage('please.use.on.suno.website'));
    }
  });
}

// 修改批量下载按钮事件处理
document.getElementById('downloadAllMp3Btn').addEventListener('click', () => {
  sendMessageToActiveTab({
    type: 'triggerBatchDownload',
    fileType: 'mp3'
  });
  updateStatus(formatMessage('preparing.batch.download.mp3'));
});

document.getElementById('downloadAllWavBtn').addEventListener('click', () => {
  sendMessageToActiveTab({
    type: 'triggerBatchDownload',
    fileType: 'wav'
  });
  updateStatus(formatMessage('preparing.batch.download.wav'));
});

// Language toggle functionality
function toggleLanguage() {
  if (typeof i18n !== 'undefined') {
    i18n.toggleLanguage();
    // Notify content script that language has changed
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'languageChanged' });
      }
    });
  }
}

// Update language UI elements
function updateLanguageUI() {
  if (typeof i18n !== 'undefined') {
    const languageText = document.getElementById('languageText');
    const languageToggleBtn = document.getElementById('languageToggleBtn');
    
    if (languageText && languageToggleBtn) {
      const currentLang = i18n.getCurrentLanguage();
      // Show both codes, highlight the active one
      if (currentLang === 'zh') {
        languageText.innerHTML = '<span class="lang-inactive">EN</span> | <span class="lang-active">中</span>';
      } else {
        languageText.innerHTML = '<span class="lang-active">EN</span> | <span class="lang-inactive">中</span>';
      }
      // Update button tooltip
      const tooltipText = currentLang === 'zh' ? 
        i18n.t('switch.to.english') : 
        i18n.t('switch.to.chinese');
      languageToggleBtn.title = tooltipText + ' / Switch Language';
    }
  }
}

// Update interface text elements
function updateUIText() {
  if (typeof i18n !== 'undefined') {
    // Update tab buttons
    const singleTabBtn = document.getElementById('singleTabBtn');
    const batchTabBtn = document.getElementById('batchTabBtn');
    
    if (singleTabBtn) singleTabBtn.textContent = i18n.t('single.download');
    if (batchTabBtn) batchTabBtn.textContent = i18n.t('batch.download');
    
    // Update delete button
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      const svg = clearAllBtn.querySelector('svg');
      clearAllBtn.innerHTML = '';
      if (svg) clearAllBtn.appendChild(svg);
      clearAllBtn.appendChild(document.createTextNode(i18n.t('delete.all')));
    }
    
    // Update batch download buttons
    const downloadAllMp3Btn = document.getElementById('downloadAllMp3Btn');
    const downloadAllWavBtn = document.getElementById('downloadAllWavBtn');
    
    if (downloadAllMp3Btn) downloadAllMp3Btn.textContent = i18n.t('download.all.mp3');
    if (downloadAllWavBtn) downloadAllWavBtn.textContent = i18n.t('download.all.wav');
    
    // Update pause/resume button
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    if (pauseResumeBtn) {
      pauseResumeBtn.textContent = isPaused ? i18n.t('resume') : i18n.t('pause');
    }
    
    // Update clear queue button
    const batchClearAllBtn = document.getElementById('batchClearAllBtn');
    if (batchClearAllBtn) batchClearAllBtn.textContent = i18n.t('clear.queue');
    
    // Update status bar
    const statusBar = document.getElementById('statusBar');
    if (statusBar && statusBar.textContent === '就绪') {
      statusBar.textContent = i18n.t('ready');
    }
    
    // Update table headers
    updateTableHeaders();
    
    // Update page headers
    updatePageHeaders();
  }
}

// Update table column headers
function updateTableHeaders() {
  if (typeof i18n !== 'undefined') {
    const headers = document.querySelectorAll('th');
    headers.forEach(header => {
      const text = header.textContent.trim();
      if (text === '文件名') header.textContent = i18n.t('filename');
      else if (text === '大小') header.textContent = i18n.t('size');
      else if (text === '状态') header.textContent = i18n.t('status');
      else if (text === '操作') header.textContent = i18n.t('actions');
    });
  }
}

// Update page section headers
function updatePageHeaders() {
  if (typeof i18n !== 'undefined') {
    // Update download progress header
    const progressSpan = document.querySelector('span[style*="color: #9ca3af"]');
    if (progressSpan && progressSpan.textContent === '下载进度') {
      progressSpan.textContent = i18n.t('download.progress');
    }
    
    // Update download list headers
    const downloadListHeaders = document.querySelectorAll('h2');
    downloadListHeaders.forEach(header => {
      const text = header.textContent.trim();
      if (text === '下载列表') {
        const svg = header.querySelector('svg');
        header.innerHTML = '';
        if (svg) header.appendChild(svg);
        header.appendChild(document.createTextNode(i18n.t('download.list')));
      } else if (text === '批量下载当前页面作品') {
        const svg = header.querySelector('svg');
        header.innerHTML = '';
        if (svg) header.appendChild(svg);
        header.appendChild(document.createTextNode(i18n.t('batch.download.current.page')));
      } else if (text === '等待下载队列') {
        const svg = header.querySelector('svg');
        header.innerHTML = '';
        if (svg) header.appendChild(svg);
        header.appendChild(document.createTextNode(i18n.t('download.queue')));
      }
    });
  }
}
