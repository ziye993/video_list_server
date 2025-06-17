const ffmpeg = require('fluent-ffmpeg');

// 创建一个新的 FFmpeg 命令实例
const command = ffmpeg();

// 执行 ffmpeg -decoders 命令
command
  .inputOptions('-c:v h264_nvdec') // 指定使用 h264_nvdec 进行 H.264 解码
  .on('start', (commandLine) => {
    console.log('正在执行命令: ' + commandLine);
  })
  .on('error', (err) => {
    console.error('执行命令时出错: ' + err.message);
  })
  .on('end', (stdout, stderr) => {
    // 检查输出中是否包含 h264_cuvid
    const supportsH264Cuvid = stdout.includes('h264_cuvid');
    if (supportsH264Cuvid) {
      console.log('FFmpeg 支持 cuvid 的 H.264 解码。');
    } else {
      console.log('FFmpeg 不支持 cuvid 的 H.264 解码。');
    }
  })
  .run();