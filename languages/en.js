// English translations for SUNO Capture
const en = {
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
  'loading': 'Loading',
  'canceled': 'Canceled',
  
  // Error messages
  'wav.not.found': 'WAV version not found for this track',
  'file.not.found': 'File not found',
  'download.interrupted': 'Download interrupted',
  'download.failed': 'Download failed',
  
  // Toast messages
  'download.started': 'Download started',
  'download.completed': 'Download completed!',
  'download.error': 'Download failed',
  
  // Comments
  'download.items.will.be.added': 'Download items will be dynamically added here',
  'batch.download.items.will.be.added': 'Batch download items will be dynamically added here',
  'remove.cdn.tailwind.reference': 'Remove CDN Tailwind reference',
  'tab.switching.buttons.and.delete.all': 'Tab switching buttons and delete all button',
  'add.spacing': 'Add spacing',
  'remove.original.tab.switching.buttons': 'Remove original tab switching buttons',
  'single.download.content': 'Single download content',
  'batch.download.content': 'Batch download content',
  'empty.history': 'No download records',
  'empty.history.instruction': 'Click the download button on the SUNO music page to start',
  
  // Status messages
  'preparing.batch.download.mp3': 'Preparing batch download MP3...',
  'preparing.batch.download.wav': 'Preparing batch download WAV...',
  'please.use.on.suno.page': 'Please use batch download on the SUNO creation list page',
  'download.error.with.filename': 'Download error: {filename} - {error}',
  'download.started.with.filename': 'Download started: {filename}',
  'downloading.with.progress': 'Downloading: {filename} ({progress}%)',
  'download.completed.with.filename': 'Download completed: {filename}',
  'download.canceled.with.filename': 'Download canceled: {filename}',
  'download.record.deleted': 'Download record deleted',
  'all.download.records.cleared': 'All download records cleared',
  'batch.queue.cleared': 'Batch download queue cleared',
  'item.removed.from.queue': 'Item removed from queue',
  'cannot.connect.to.suno': 'Cannot connect to SUNO page, please refresh and try again',
  'message.send.failed': 'Message send failed, please refresh and try again',
  'please.use.on.suno.website': 'Please use this feature on the SUNO website',
  
  // Toast messages
  'no.music.found': 'No downloadable music found',
  'cannot.extract.music.id': 'Cannot extract music ID',
  'added.to.download.queue': 'Added {count} songs to download queue',
  
  // Language toggle
  'language': 'Language',
  'switch.to.english': 'Switch to English',
  'switch.to.chinese': 'Switch to Chinese',
  
  // New keys for batch queue UI and error states
  'empty.queue': 'No items in the download queue',
  'empty.queue.instruction': 'Click "Download All MP3" or "Download All WAV" to start',
  'queue.waiting': 'Waiting',
  'queue.processing': 'Processing',
  'queue.completed': 'Completed',
  'queue.error': 'Error',
  'queue.notfound': 'Not found',
  'download.failed': 'Download failed'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = en;
} 