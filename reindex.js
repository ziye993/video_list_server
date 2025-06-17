const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const app = express();
const port = 3000;

// 设置 multer 存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('image')) {
      cb(null, 'D://.windowsUploadImage/');
    } else if (file.mimetype.startsWith('video')) {
      cb(null, 'D://.windowsVideo/');
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));


const folderPath = 'D:\\.windowsVideo';

// 使用 express.static 中间件来代理文件夹
app.use(express.static(folderPath));

// 处理根路径请求，返回文件列表页面
app.get('/', (req, res) => {
  const videoDir = 'D://.windowsVideo/';
  fs.readdir(videoDir, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error reading directory');
      return;
    }
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.avi', '.mov'].includes(ext);
    });
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video List</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        .video-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .video-item {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            text-align: center;
        }
        .video-item a {
            text-decoration: none;
            color: #333;
        }
        .upload-link {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: #007BFF;
            text-decoration: none;
        }
        button {
            display: block;
            margin: 20px auto;
            background-color: #007BFF;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <h1>Video List</h1>
    <button onclick="refreshThumbnails()">刷新</button>
    <div class="video-list">
        ${videoFiles.map(file => {
      const thumbnailPath = `D://.windowsVideoTmpImage/${path.parse(file).name}.png`;
      const hasThumbnail = fs.existsSync(thumbnailPath);
      return `
            <div class="video-item">
                ${hasThumbnail ? `<img src="${thumbnailPath}" alt="Thumbnail" style="max-width: 100%; height: auto; margin-bottom: 10px;">` : ''}
                <a href="/file?fileName=${encodeURIComponent(file)}">${file}</a>
            </div>
            `;
    }).join('')}
    </div>
    <a href="/upload" class="upload-link">Upload File</a>
    <script>
        function refreshThumbnails() {
            fetch('/refresh')
              .then(response => response.text())
              .then(data => {
                    alert(data);
                    location.reload();
                })
              .catch(error => {
                    alert('Error refreshing thumbnails: ' + error);
                });
        }
    </script>
</body>
</html>
        `);
  });
});

// 处理文件播放请求
app.get('/file', (req, res) => {
  const fileName = req.query.fileName;
  const filePath = path.join('D://.windowsVideo/', fileName);
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
</head>
<body>
    <video width="640" height="360" controls>
        <source src="http://localhost:3000/${fileName}" type="video/mp4">
        Your browser does not support the video tag.
    </video>
</body>
</html>
    `);
});

// 处理上传页面请求
app.get('/upload', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload File</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        form {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
        }
        input[type="file"] {
            margin-bottom: 10px;
        }
        input[type="submit"] {
            background-color: #007BFF;
            color: #fff;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        input[type="submit"]:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <h1>Upload File</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" required>
        <input type="submit" value="Upload">
    </form>
</body>
</html>
    `);
});

// 处理文件上传请求
app.post('/upload', upload.single('file'), (req, res) => {
  res.send('File uploaded successfully');
});

// 处理刷新请求
app.get('/refresh', (req, res) => {
  const tmpImageDir = 'D://.windowsVideoTmpImage/';
  const videoDir = 'D://.windowsVideo/';

  // 清除临时图片目录
  fs.readdir(tmpImageDir, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error reading temporary image directory');
      return;
    }
    files.forEach(file => {
      const filePath = path.join(tmpImageDir, file);
      fs.unlinkSync(filePath);
    });

    // 截取视频第一帧作为缩略图
    fs.readdir(videoDir, (err, videoFiles) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error reading video directory');
        return;
      }
      videoFiles.forEach(videoFile => {
        const videoPath = path.join(videoDir, videoFile);
        const thumbnailPath = path.join(tmpImageDir, `${path.parse(videoFile).name}.png`);
        ffmpeg(videoPath)
          .on('end', () => {
            console.log(`Thumbnail created for ${videoFile}`);
          })
          .on('error', err => {
            console.error(`Error creating thumbnail for ${videoFile}:`, err);
          })
          .screenshots({
            count: 1,
            timestamps: ['00:00:00'],
            filename: path.basename(thumbnailPath),
            folder: tmpImageDir
          });
      });
      res.send('Thumbnails refreshed successfully');
    });
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});    