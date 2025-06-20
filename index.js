const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const os = require('os');
const { getUploadEngine, readFileOrDirectory, exists, readJsonFile, writeJsonFile } = require('./filesUtils')
const port = 3000;
app.use(cors());

async function tempPng(videoPath, thumbnailPath, callback) {
  // const videoPath = path.join(videoDir, videoFile);
  // const thumbnailPath = path.join(tmpImageDir, `${path.parse(videoFile).name}.png`);
  // 获取视频时长
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        callback('error')
        resolve(false)
      }
      const duration = metadata.format.duration;
      // 生成随机时间戳
      const randomTimestamp = Math.random() * duration;
      const randomTime = new Date(randomTimestamp * 1000).toISOString().substr(11, 8);
      ffmpeg(videoPath)
        // .inputOptions('-hwaccel cuvid') // 使用 CUDA 硬件加速
        // .videoCodec('h264_cuvid') // 使用 CUDA 解码 H.264 视频
        .on('end', () => {
          callback('success');
          resolve(true)
        })
        .on('error', err => {
          console.error(`错误于： ${videoFile}:`, err);
          if (processedVideos === videoFiles.length) {
            callback('error');
            resolve(false)
          }
        })
        .screenshots({
          count: 1,
          timestamps: [randomTime],
          filename: path.basename(thumbnailPath),
          folder: tmpFolderPath
        });
    });
  })

}

// const globalApi = 'http://www.ziye993.cn/videosource';

const tmpFolderPath = '/backup/.windowsVideoTmpImage';
const folderPath = '/backup/.windowsVideo';
const uploadImagePath = '/backup/.windowsUploadImage'
const videoListDataPath = "/backup/.windowsVideoTmpImage/videoList.json";

// 存储引擎 // 根据上传文件类型 存储到不同的文件夹
const upload = getUploadEngine(uploadImagePath, folderPath);

//video文件夹代理
// app.use(express.static(folderPath));
//缩略图代理
// app.use(express.static(tmpFolderPath));
// 代理web
let isRefresh = false;

//缓存视频列表
let vodeoListData = [];

app.get('/', (req, res) => {
  res.send({ success: true })
})

// 获取视频列表数据（在缓存中）
app.get('/getFileList', async (req, res) => {
  console.log(`[send] ::  ${vodeoListData.length}  [time] :: ${new Date()}`)
  res.status(200).send({
    succss: true,
    data: vodeoListData,
  })
});

app.get('/refreshBlock', async (req, res) => {
  if (isRefresh) {
    res.status(200).send('当前正在刷新了，稍后再试！');
    return;
  }
  isRefresh = true;

  // 获取视频目录
  const videoFileList = vodeoListData; // await readFileOrDirectory(folderPath);
  if (videoFileList.type === 'error') {
    isRefresh = false;
    res.status(500).send({ error: 'READERROR' });
  }

  console.log(videoFileList.length)
  const refList = [];
  for (let i = 0; i < videoFileList.length; i++) {

    if (await exists(tmpFolderPath + `\\${videoFileList[i].fileName}.png`)) {
    } else {
      refList.push(videoFileList[i])
    }
  }
  console.log(`找到：${refList.length}：条数据`);
  let suNumber = 0;
  for (let i = 0; i < refList.length; i++) {
    const _ = refList[i];
    suNumber++;
    await tempPng(_.path, path.join(tmpFolderPath, `${_.fileName}.png`), (status) => {
      if (status === 'error') {
        errNumber++;
      } else {
        console.log(`第${i}条刷新完毕`);
      }
      isRefresh = false;
    });
  }

  console.log(`刷新完毕: 共计${refList.length}，成功${suNumber}`);
  isRefresh = false;
  res.status(200).send({
    data: {
      reNumber: refList.length,
      suNumber
    }
  })
})

// 处理文件上传请求
app.post('/upload', upload.single('file'), (req, res) => {
  res.send('上传成功');
});

// 处理刷新请求
app.get('/refreshAll', (req, res) => {
  if (isRefresh) {
    res.status(200).send('当前正在刷新了，稍后再试！');
    return;
  }
  isRefresh = true;

  const tmpImageDir = tmpFolderPath;
  const videoDir = folderPath;

  // 清除临时图片目录
  fs.readdir(tmpImageDir, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('失败！');
      isRefresh = false;
      return;
    }
    files.forEach(file => {
      const filePath = path.join(tmpImageDir, file);
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error(`删除文件 ${filePath} 时出错:`, unlinkErr);
      }

    });

    // 读取视频目录
    fs.readdir(videoDir, (err, videoFiles) => {
      if (err) {
        console.error(err);
        res.status(500).send('失败！');
        isRefresh = false;
        return;
      }

      let processedVideos = 0;
      videoFiles.forEach(videoFile => {
        const videoPath = path.join(videoDir, videoFile);
        const thumbnailPath = path.join(tmpImageDir, `${path.parse(videoFile).name}.png`);

        // 获取视频时长
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) {
            console.error(`获取视频时长出错: ${videoFile}`, err);
            processedVideos++;
            if (processedVideos === videoFiles.length) {
              console.log('刷新完成！');
              res.send('刷新完成！');
              isRefresh = false;
            }
            return;
          }
          const duration = metadata.format.duration;
          // 生成随机时间戳
          const randomTimestamp = Math.random() * duration;
          const randomTime = new Date(randomTimestamp * 1000).toISOString().substr(11, 8);

          ffmpeg(videoPath)
            // .inputOptions('-hwaccel cuvid') // 使用 CUDA 硬件加速
            // .videoCodec('h264_cuvid') // 使用 CUDA 解码 H.264 视频
            .on('end', () => {
              console.log(`当前刷新： ${videoFile}`);
              processedVideos++;
              if (processedVideos === videoFiles.length) {
                console.log('刷新完成！');
                res.send('刷新完成！');
                isRefresh = false;
              }
            })
            .on('error', err => {
              console.error(`错误于： ${videoFile}:`, err);
              processedVideos++;
              if (processedVideos === videoFiles.length) {
                console.log('刷新完成！');
                res.send('刷新完成！');
                isRefresh = false;
              }
            })
            .screenshots({
              count: 1,
              timestamps: [randomTime],
              filename: path.basename(thumbnailPath),
              folder: tmpImageDir
            });
        });
      });
    });
  });
});

app.get('/refList', async (req, res) => {
  const file = await readFileOrDirectory(videoListDataPath);
  if (file.type !== 'error') {
    let list = [];
    try {
      const content = JSON.parse(file.content);
      vodeoListData = content.list || [];
    } catch (error) {
      console.log(error)
    }

    if (!list.length) {
      const videoFileList = await readFileOrDirectory(folderPath);
      if (videoFileList.type !== 'error') {
        vodeoListData = videoFileList.list;
      }
    }
    res.status(200).send({
      success: 'success',
      data: vodeoListData,
    })
  }
})


app.use((req, res, next) => {
  res.status(404).send('未找到该页面');
});


(async () => {

  // 获取数据写入缓存中
  const file = await readFileOrDirectory(videoListDataPath);
  if (file.type !== 'error') {
    let list = [];
    try {
      const content = JSON.parse(file.content);
      vodeoListData = content.list || [];
    } catch (error) {
      // res.send({
      //   error: 'JSON_ERROR'
      // });
      console.log(error)
    }

    if (!list.length) {
      const videoFileList = await readFileOrDirectory(folderPath);
      if (videoFileList.type !== 'error') {
        vodeoListData = videoFileList.list;
      }
    }
  }

  // 启动服务器
  app.listen(port, () => {
    console.log(`port ${port}`);
  });

})();


