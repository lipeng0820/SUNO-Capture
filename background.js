// 活跃下载任务
let activeDownloads = {};

// 批量下载队列
let batchDownloadQueue = [];
let isBatchDownloading = false;
let isPaused = false;

// Get localized error message
function getLocalizedError(key) {
  // Default fallback messages
  const fallbackMessages = {
    'wav.not.found': '该曲目没有找到对应的WAV版本',
    'file.not.found': '文件不存在',
    'download.interrupted': '下载中断'
  };
  
  // For now, return the Chinese version as default
  // In a full implementation, this would check the stored language preference
  return fallbackMessages[key] || key;
}

// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('SUNO Capture 插件已安装');
  
  // 从存储中恢复活跃下载和批量下载队列
  chrome.storage.local.get(['activeDownloads', 'batchDownloadQueue', 'isBatchDownloading', 'isPaused'], (result) => {
    if (result.activeDownloads) {
      activeDownloads = result.activeDownloads;
    }
    if (result.batchDownloadQueue) {
      batchDownloadQueue = result.batchDownloadQueue;
    }
    if (result.isBatchDownloading !== undefined) {
      isBatchDownloading = result.isBatchDownloading;
    }
    if (result.isPaused !== undefined) {
      isPaused = result.isPaused;
    }
    
    // 如果有未完成的批量下载任务且未暂停，继续下载
    if (batchDownloadQueue.length > 0 && isBatchDownloading && !isPaused) {
      processBatchDownloadQueue();
    }
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'downloadMusic') {
    handleDownloadMusic(message.musicUuid, message.shareId, message.downloadType);
  } else if (message.type === 'downloadDirectly') {
    handleDirectDownload(message.url, message.filename);
  } else if (message.type === 'cancelDownload') {
    cancelDownload(message.downloadId);
  } else if (message.type === 'batchDownloadMusic') {
    handleBatchDownloadMusic(message.musicUuids, message.fileType);
  } else if (message.type === 'pauseBatchDownload') {
    pauseBatchDownload();
  } else if (message.type === 'resumeBatchDownload') {
    resumeBatchDownload();
  } else if (message.type === 'clearBatchDownloadQueue') {
    clearBatchDownloadQueue();
  } else if (message.type === 'removeBatchDownloadItem') {
    removeBatchDownloadItem(message.queueItemId);
  }
  return true;
});

// 处理音乐下载
function handleDownloadMusic(musicUuid, shareId, downloadType) {
  console.log(`开始下载: ${downloadType} - ${musicUuid}`);
  
  if (downloadType === 'mp3') {
    downloadFile(musicUuid, shareId, 'mp3');
  }
  
  if (downloadType === 'wav') {
    downloadFile(musicUuid, shareId, 'wav');
  }
}

// 下载文件
function downloadFile(musicUuid, shareId, fileType) {
  const url = `https://cdn1.suno.ai/${musicUuid}.${fileType}`;
  const filename = `${shareId}.${fileType}`;
  const downloadId = generateDownloadId();
  
  // 创建下载任务
  const downloadTask = {
    id: downloadId,
    url: url,
    filename: filename,
    fileType: fileType,
    status: 'loading',
    progress: 0,
    startTime: Date.now()
  };
  
  activeDownloads[downloadId] = downloadTask;
  saveActiveDownloads();
  
  // 通知UI开始下载
  chrome.runtime.sendMessage({
    type: 'downloadStarted',
    downloadId: downloadId,
    filename: filename,
    fileType: fileType
  });
  
  // 检查文件大小
  fetch(url, {
    method: 'HEAD'
  }).then(response => {
    if (!response.ok) {
      if (fileType === 'wav') {
        throw new Error(getLocalizedError('wav.not.found'));
      } else {
        throw new Error(getLocalizedError('file.not.found'));
      }
    }
    
    const fileSize = parseInt(response.headers.get('content-length') || '0');
    downloadTask.fileSize = fileSize;
    
    // 开始下载
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify'
    }, (downloadItemId) => {
      if (chrome.runtime.lastError) {
        handleDownloadError(downloadId, chrome.runtime.lastError.message);
        return;
      }
      
      downloadTask.browserDownloadId = downloadItemId;
      downloadTask.status = 'downloading';
      saveActiveDownloads();
      
      // 监听下载进度
      monitorDownloadProgress(downloadId, downloadItemId, fileSize);
    });
  }).catch(error => {
    handleDownloadError(downloadId, error.message);
  });
}

// 监控下载进度
function monitorDownloadProgress(downloadId, browserDownloadId, fileSize) {
  const checkProgress = () => {
    if (!activeDownloads[downloadId]) return;
    
    chrome.downloads.search({id: browserDownloadId}, (items) => {
      if (items.length === 0) return;
      
      const item = items[0];
      
      if (item.state === 'in_progress') {
        const progress = Math.round((item.bytesReceived / fileSize) * 100);
        updateDownloadProgress(downloadId, progress, fileSize);
        
        // 继续监控
        setTimeout(checkProgress, 500);
      } else if (item.state === 'complete') {
        completeDownload(downloadId);
      } else if (item.state === 'interrupted') {
        handleDownloadError(downloadId, getLocalizedError('download.interrupted'));
      }
    });
  };
  
  // 开始监控
  checkProgress();
}

// 更新下载进度
function updateDownloadProgress(downloadId, progress, fileSize) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.progress = progress;
    download.fileSize = fileSize;
    saveActiveDownloads();
    
    // 通知UI更新进度
    chrome.runtime.sendMessage({
      type: 'downloadProgress',
      downloadId: downloadId,
      progress: progress,
      fileSize: fileSize
    });
  }
}

// 完成下载
function completeDownload(downloadId) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.status = 'completed';
    download.progress = 100;
    download.endTime = Date.now();
    
    // 更新下载历史
    chrome.storage.local.get(['downloadHistory'], (result) => {
      let downloadHistory = result.downloadHistory || [];
      downloadHistory.unshift({
        id: download.id,
        filename: download.filename,
        fileType: download.fileType,
        fileSize: download.fileSize,
        status: 'completed',
        progress: 100,
        timestamp: download.startTime
      });
      
      // 保存更新后的历史记录
      chrome.storage.local.set({downloadHistory: downloadHistory});
    });
    
    // 从活跃下载中移除
    delete activeDownloads[downloadId];
    saveActiveDownloads();
    
    // 通知UI下载完成
    chrome.runtime.sendMessage({
      type: 'downloadComplete',
      downloadId: downloadId
    });
    
    console.log(`下载完成: ${download.filename}`);
  }
}

// 处理下载错误
function handleDownloadError(downloadId, errorMessage) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.status = 'error';
    download.error = errorMessage;
    download.endTime = Date.now();
    
    // 更新下载历史
    chrome.storage.local.get(['downloadHistory'], (result) => {
      let downloadHistory = result.downloadHistory || [];
      downloadHistory.unshift({
        id: download.id,
        filename: download.filename,
        fileType: download.fileType,
        fileSize: download.fileSize,
        status: 'error',
        error: errorMessage,
        timestamp: download.startTime
      });
      
      // 保存更新后的历史记录
      chrome.storage.local.set({downloadHistory: downloadHistory});
    });
    
    // 从活跃下载中移除
    delete activeDownloads[downloadId];
    saveActiveDownloads();
    
    // 通知UI下载错误
    chrome.runtime.sendMessage({
      type: 'downloadError',
      downloadId: downloadId,
      error: errorMessage
    });
    
    console.error(`下载错误: ${download.filename} - ${errorMessage}`);
  }
}

// 取消下载
function cancelDownload(downloadId) {
  const download = activeDownloads[downloadId];
  if (download && download.browserDownloadId) {
    chrome.downloads.cancel(download.browserDownloadId, () => {
      download.status = 'canceled';
      download.endTime = Date.now();
      
      // 从活跃下载中移除
      delete activeDownloads[downloadId];
      saveActiveDownloads();
      
      console.log(`已取消下载: ${download.filename}`);
    });
  }
}

// 保存活跃下载到存储
function saveActiveDownloads() {
  chrome.storage.local.set({activeDownloads: activeDownloads});
}

// 生成唯一下载ID
function generateDownloadId() {
  return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 处理直接下载
function handleDirectDownload(url, filename) {
  console.log(`开始直接下载: ${url}`);
  
  const downloadId = generateDownloadId();
  const fileType = filename.split('.').pop();
  
  // 创建下载任务
  const downloadTask = {
    id: downloadId,
    url: url,
    filename: filename,
    fileType: fileType,
    status: 'loading',
    progress: 0,
    startTime: Date.now()
  };
  
  activeDownloads[downloadId] = downloadTask;
  saveActiveDownloads();
  
  // 通知UI开始下载
  chrome.runtime.sendMessage({
    type: 'downloadStarted',
    downloadId: downloadId,
    filename: filename,
    fileType: fileType
  });
  
  // 检查文件大小
  fetch(url, {
    method: 'HEAD'
  }).then(response => {
    if (!response.ok) {
      if (fileType === 'wav') {
        throw new Error(getLocalizedError('wav.not.found'));
      } else {
        throw new Error(getLocalizedError('file.not.found'));
      }
    }
    
    const fileSize = parseInt(response.headers.get('content-length') || '0');
    downloadTask.fileSize = fileSize;
    
    // 开始下载
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify'
    }, (downloadItemId) => {
      if (chrome.runtime.lastError) {
        handleDownloadError(downloadId, chrome.runtime.lastError.message);
        return;
      }
      
      downloadTask.browserDownloadId = downloadItemId;
      downloadTask.status = 'downloading';
      saveActiveDownloads();
      
      // 监听下载进度
      monitorDownloadProgress(downloadId, downloadItemId, fileSize);
    });
  }).catch(error => {
    handleDownloadError(downloadId, error.message);
  });
}

// 处理批量下载音乐
function handleBatchDownloadMusic(musicData, fileType) {
  console.log(`开始批量下载: ${fileType} - ${musicData.length} 首音乐`);
  
  // 为每个音乐数据创建下载任务
  const newQueueItems = musicData.map(item => {
    return {
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      musicUuid: item.uuid,
      songTitle: item.title,
      fileType: fileType,
      status: 'waiting',
      timestamp: Date.now()
    };
  });
  
  // 添加到下载队列
  batchDownloadQueue = [...batchDownloadQueue, ...newQueueItems];
  
  // 保存队列状态
  saveBatchDownloadQueue();
  
  // 通知UI更新队列
  chrome.runtime.sendMessage({
    type: 'batchQueueUpdated',
    queue: batchDownloadQueue
  });
  
  // 如果当前没有正在进行的批量下载，开始处理队列
  if (!isBatchDownloading && !isPaused) {
    isBatchDownloading = true;
    saveBatchDownloadState();
    processBatchDownloadQueue();
  }
}

// 处理批量下载队列
function processBatchDownloadQueue() {
  // 如果暂停或队列为空，停止处理
  if (isPaused || batchDownloadQueue.length === 0) {
    isBatchDownloading = false;
    saveBatchDownloadState();
    return;
  }
  
  // 查找第一个等待中的任务
  const nextItem = batchDownloadQueue.find(item => item.status === 'waiting');
  if (!nextItem) {
    isBatchDownloading = false;
    saveBatchDownloadState();
    return;
  }
  
  // 更新任务状态
  nextItem.status = 'processing';
  saveBatchDownloadQueue();
  
  // 通知UI更新队列
  chrome.runtime.sendMessage({
    type: 'batchQueueUpdated',
    queue: batchDownloadQueue
  });
  
  // 创建下载任务
  const musicUuid = nextItem.musicUuid;
  const songTitle = nextItem.songTitle;
  const fileType = nextItem.fileType;
  const url = `https://cdn1.suno.ai/${musicUuid}.${fileType}`;
  const filename = `${songTitle}.${fileType}`;
  
  console.log(`开始处理批量下载项: ${filename}`);
  
  // 生成下载ID
  const downloadId = generateDownloadId();
  
  // 创建下载任务
  const downloadTask = {
    id: downloadId,
    url: url,
    filename: filename,
    fileType: fileType,
    status: 'loading',
    progress: 0,
    startTime: Date.now(),
    queueItemId: nextItem.id
  };
  
  activeDownloads[downloadId] = downloadTask;
  saveActiveDownloads();
  
  // 检查文件大小
  fetch(url, {
    method: 'HEAD'
  }).then(response => {
    if (!response.ok) {
      if (fileType === 'wav') {
        throw new Error(getLocalizedError('wav.not.found'));
      } else {
        throw new Error(getLocalizedError('file.not.found'));
      }
    }
    
    const fileSize = parseInt(response.headers.get('content-length') || '0');
    downloadTask.fileSize = fileSize;
    
    // 开始下载
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify'
    }, (downloadItemId) => {
      if (chrome.runtime.lastError) {
        handleBatchDownloadError(downloadId, chrome.runtime.lastError.message);
        return;
      }
      
      downloadTask.browserDownloadId = downloadItemId;
      downloadTask.status = 'downloading';
      saveActiveDownloads();
      
      // 监听下载进度
      monitorBatchDownloadProgress(downloadId, downloadItemId, fileSize);
    });
  }).catch(error => {
    handleBatchDownloadError(downloadId, error.message);
  });
}

// 监控批量下载进度
function monitorBatchDownloadProgress(downloadId, browserDownloadId, fileSize) {
  const checkProgress = () => {
    if (!activeDownloads[downloadId]) return;
    
    chrome.downloads.search({id: browserDownloadId}, (items) => {
      if (items.length === 0) return;
      
      const item = items[0];
      
      if (item.state === 'in_progress') {
        const progress = Math.round((item.bytesReceived / fileSize) * 100);
        updateDownloadProgress(downloadId, progress, fileSize);
        
        // 继续监控
        setTimeout(checkProgress, 500);
      } else if (item.state === 'complete') {
        completeBatchDownload(downloadId);
      } else if (item.state === 'interrupted') {
        handleBatchDownloadError(downloadId, getLocalizedError('download.interrupted'));
      }
    });
  };
  
  // 开始监控
  checkProgress();
}

// 更新批量下载进度
function updateDownloadProgress(downloadId, progress, fileSize) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.progress = progress;
    download.fileSize = fileSize;
    saveActiveDownloads();
    
    // 通知UI更新进度
    chrome.runtime.sendMessage({
      type: 'downloadProgress',
      downloadId: downloadId,
      progress: progress,
      fileSize: fileSize
    });
  }
}

// 完成批量下载
function completeBatchDownload(downloadId) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.status = 'completed';
    download.progress = 100;
    download.endTime = Date.now();
    
    // 更新下载历史
    chrome.storage.local.get(['downloadHistory'], (result) => {
      let downloadHistory = result.downloadHistory || [];
      downloadHistory.unshift({
        id: download.id,
        filename: download.filename,
        fileType: download.fileType,
        fileSize: download.fileSize,
        status: 'completed',
        progress: 100,
        timestamp: download.startTime
      });
      
      // 保存更新后的历史记录
      chrome.storage.local.set({downloadHistory: downloadHistory});
    });
    
    // 从活跃下载中移除
    delete activeDownloads[downloadId];
    saveActiveDownloads();
    
    // 通知UI下载完成
    chrome.runtime.sendMessage({
      type: 'downloadComplete',
      downloadId: downloadId
    });
    
    console.log(`下载完成: ${download.filename}`);
    
    // 更新队列中对应项的状态
    if (download.queueItemId) {
      const queueItem = batchDownloadQueue.find(item => item.id === download.queueItemId);
      if (queueItem) {
        queueItem.status = 'completed';
        saveBatchDownloadQueue();
        
        // 通知UI更新队列
        chrome.runtime.sendMessage({
          type: 'batchQueueUpdated',
          queue: batchDownloadQueue
        });
      }
    }
    
    // 延迟一秒后处理下一个队列项
    setTimeout(() => {
      processBatchDownloadQueue();
    }, 1000);
  }
}

// 处理批量下载错误
function handleBatchDownloadError(downloadId, errorMessage) {
  const download = activeDownloads[downloadId];
  if (download) {
    download.status = 'error';
    download.error = errorMessage;
    download.endTime = Date.now();
    
    // 更新下载历史
    chrome.storage.local.get(['downloadHistory'], (result) => {
      let downloadHistory = result.downloadHistory || [];
      downloadHistory.unshift({
        id: download.id,
        filename: download.filename,
        fileType: download.fileType,
        fileSize: download.fileSize,
        status: 'error',
        error: errorMessage,
        timestamp: download.startTime
      });
      
      // 保存更新后的历史记录
      chrome.storage.local.set({downloadHistory: downloadHistory});
    });
    
    // 从活跃下载中移除
    delete activeDownloads[downloadId];
    saveActiveDownloads();
    
    // 通知UI下载错误
    chrome.runtime.sendMessage({
      type: 'downloadError',
      downloadId: downloadId,
      error: errorMessage
    });
    
    console.error(`下载错误: ${download.filename} - ${errorMessage}`);
    
    // 更新队列中对应项的状态
    if (download.queueItemId) {
      const queueItem = batchDownloadQueue.find(item => item.id === download.queueItemId);
      if (queueItem) {
        queueItem.status = 'error';
        queueItem.error = errorMessage;
        saveBatchDownloadQueue();
        
        // 通知UI更新队列
        chrome.runtime.sendMessage({
          type: 'batchQueueUpdated',
          queue: batchDownloadQueue
        });
      }
    }
    
    // 延迟一秒后处理下一个队列项
    setTimeout(() => {
      processBatchDownloadQueue();
    }, 1000);
  }
}

// 取消批量下载
function cancelBatchDownload(downloadId) {
  const download = activeDownloads[downloadId];
  if (download && download.browserDownloadId) {
    chrome.downloads.cancel(download.browserDownloadId, () => {
      download.status = 'canceled';
      download.endTime = Date.now();
      
      // 从活跃下载中移除
      delete activeDownloads[downloadId];
      saveActiveDownloads();
      
      console.log(`已取消下载: ${download.filename}`);
    });
  }
}

// 保存批量下载队列到存储
function saveBatchDownloadQueue() {
  chrome.storage.local.set({batchDownloadQueue: batchDownloadQueue});
}

function saveBatchDownloadState() {
  chrome.storage.local.set({isBatchDownloading: isBatchDownloading, isPaused: isPaused});
}

// 暂停批量下载
function pauseBatchDownload() {
  isPaused = true;
  saveBatchDownloadState();
  
  // 通知UI更新状态
  chrome.runtime.sendMessage({
    type: 'batchDownloadPaused'
  });
  
  console.log('批量下载已暂停');
}

// 恢复批量下载
function resumeBatchDownload() {
  isPaused = false;
  saveBatchDownloadState();
  
  // 通知UI更新状态
  chrome.runtime.sendMessage({
    type: 'batchDownloadResumed'
  });
  
  console.log('批量下载已恢复');
  
  // 如果队列中有等待的项目，开始处理
  if (batchDownloadQueue.some(item => item.status === 'waiting') && !isBatchDownloading) {
    isBatchDownloading = true;
    saveBatchDownloadState();
    processBatchDownloadQueue();
  }
}

// 清空批量下载队列
function clearBatchDownloadQueue() {
  // 取消所有正在进行的批量下载
  Object.keys(activeDownloads).forEach(downloadId => {
    const download = activeDownloads[downloadId];
    if (download && download.queueItemId) {
      cancelDownload(downloadId);
    }
  });
  
  // 清空队列
  batchDownloadQueue = [];
  isBatchDownloading = false;
  saveBatchDownloadQueue();
  saveBatchDownloadState();
  
  // 通知UI更新队列
  chrome.runtime.sendMessage({
    type: 'batchQueueUpdated',
    queue: batchDownloadQueue
  });
  
  console.log('批量下载队列已清空');
}

// 从队列中移除单个项目
function removeBatchDownloadItem(queueItemId) {
  // 查找对应的活跃下载
  const downloadId = Object.keys(activeDownloads).find(id => 
    activeDownloads[id].queueItemId === queueItemId
  );
  
  // 如果正在下载，取消下载
  if (downloadId) {
    cancelDownload(downloadId);
  }
  
  // 从队列中移除
  batchDownloadQueue = batchDownloadQueue.filter(item => item.id !== queueItemId);
  saveBatchDownloadQueue();
  
  // 通知UI更新队列
  chrome.runtime.sendMessage({
    type: 'batchQueueUpdated',
    queue: batchDownloadQueue
  });
  
  console.log(`已从队列中移除项目: ${queueItemId}`);
}

// 安全发送消息到内容脚本
function sendMessageToContentScript(tabId, message) {
  try {
    chrome.tabs.sendMessage(tabId, message, response => {
      if (chrome.runtime.lastError) {
        console.log('发送消息到内容脚本时出错:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('发送消息到内容脚本失败:', error);
  }
}

// 安全发送消息到所有页面
function broadcastMessage(message) {
  chrome.tabs.query({url: ["*://*.suno.com/*", "*://*.suno.ai/*"]}, tabs => {
    tabs.forEach(tab => {
      sendMessageToContentScript(tab.id, message);
    });
  });
  
  // 同时发送给popup
  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        // 忽略错误，popup可能未打开
        console.log('发送消息到popup时出错:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('发送消息到popup失败:', error);
  }
}
