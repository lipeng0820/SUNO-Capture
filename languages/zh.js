// Chinese translations for SUNO Capture
const zh = {
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
  'loading': '加载中',
  'canceled': '已取消',
  
  // Error messages
  'wav.not.found': '该曲目没有找到对应的WAV版本',
  'file.not.found': '文件不存在',
  'download.interrupted': '下载中断',
  'download.failed': '下载失败',
  
  // Toast messages
  'download.started': '开始下载',
  'download.completed': '下载完成！',
  'download.error': '下载失败',
  
  // Comments
  'download.items.will.be.added': '下载项将在这里动态添加',
  'batch.download.items.will.be.added': '批量下载项将在这里动态添加',
  'remove.cdn.tailwind.reference': '移除 CDN Tailwind 引用',
  'tab.switching.buttons.and.delete.all': '标签页切换按钮和全部删除按钮',
  'add.spacing': '添加间隔',
  'remove.original.tab.switching.buttons': '移除原来的标签页切换按钮',
  'single.download.content': '单作品下载内容',
  'batch.download.content': '批量下载内容',
  
  // Language toggle
  'language': '语言',
  'switch.to.english': '切换到英文',
  'switch.to.chinese': '切换到中文',
  
  // New keys for batch queue UI and error states
  'empty.queue': '暂无下载队列',
  'empty.queue.instruction': '点击"下载所有MP3"或"下载所有WAV"按钮开始',
  'queue.waiting': '等待中',
  'queue.processing': '处理中',
  'queue.completed': '已完成',
  'queue.error': '错误',
  'queue.notfound': '未找到',
  'empty.history': '暂无下载记录',
  'empty.history.instruction': '在 SUNO 音乐页面点击下载按钮开始',
  
  // Status messages
  'preparing.batch.download.mp3': '正在准备批量下载MP3...',
  'preparing.batch.download.wav': '正在准备批量下载WAV...',
  'please.use.on.suno.page': '请在SUNO创作列表页面使用批量下载功能',
  'download.error.with.filename': '下载错误: {filename} - {error}',
  'download.started.with.filename': '开始下载: {filename}',
  'downloading.with.progress': '下载中: {filename} ({progress}%)',
  'download.completed.with.filename': '下载完成: {filename}',
  'download.canceled.with.filename': '已取消下载: {filename}',
  'download.record.deleted': '已删除下载记录',
  'all.download.records.cleared': '已清除所有下载记录',
  'batch.queue.cleared': '已清空批量下载队列',
  'item.removed.from.queue': '已从队列中移除项目',
  'cannot.connect.to.suno': '无法连接到SUNO页面，请刷新页面后重试',
  'message.send.failed': '发送消息失败，请刷新页面后重试',
  'please.use.on.suno.website': '请在SUNO网站上使用此功能',
  
  // Toast messages
  'no.music.found': '未找到可下载的音乐',
  'cannot.extract.music.id': '无法提取音乐ID',
  'added.to.download.queue': '已添加 {count} 首音乐到下载队列'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = zh;
} 