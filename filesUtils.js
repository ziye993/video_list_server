const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');


/**
 * 将 Date 对象转换为 YYYY-MM-DD HH:mm:ss 格式的字符串
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化的日期字符串
 */
function formatDateTime(date) {
  if (!(date instanceof Date)) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 读取文件或目录内容
 * @param {string} filePath - 文件或目录路径（绝对或相对）
 * @returns {Promise<{content: string|object, type: 'file'}|{list: string[], type: 'folder'}>}
 */
async function readFileOrDirectory(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);

    if (stats.isDirectory()) {
      const files = await fs.readdir(resolvedPath);
      const list = await Promise.all(
        files.map(async (fileName) => {
          const fileFullPath = path.join(resolvedPath, fileName);
          const fileStats = await fs.stat(fileFullPath);
          const parts = fileName.split('.');

          const _fileInfo = {
            ext: parts.pop(),
            name: parts.join('.'),
          }
          return {
            name: fileName,
            path: filePath + `\\${fileName}`,
            fileName: _fileInfo.name,
            ext: _fileInfo.ext,
            size: Math.floor(fileStats.size / 1024 / 1024),
            unit: 'MB',
            // 添加时间戳和格式化字符串两种表示
            mtime: {
              timestamp: fileStats.mtime.getTime(), // 时间戳（毫秒）
              formatted: formatDateTime(fileStats.mtime) // 格式化字符串
            },
            ctime: {
              timestamp: fileStats.ctime.getTime(),
              formatted: formatDateTime(fileStats.ctime)
            },
            atime: {
              timestamp: fileStats.atime.getTime(),
              formatted: formatDateTime(fileStats.atime)
            },
            birthtime: {
              timestamp: fileStats.birthtime.getTime(),
              formatted: formatDateTime(fileStats.birthtime)
            },
            isDirectory: fileStats.isDirectory(),
          };
        })
      );

      return {
        list,
        type: 'folder'
      };
    } else {
      const content = await fs.readFile(resolvedPath, 'utf8');
      return {
        content,
        type: 'file'
      };
    }
  } catch (error) {
    console.error(`读取文件/目录失败: ${error.message}`);
    throw error;
  }
}
/**
 * 写入内容到文件
 * @param {string} filePath - 文件路径（绝对或相对）
 * @param {string} writeMode - 写入模式 ('append'|'cover')
 * @param {string} content - 要写入的内容
 * @returns {Promise<void>}
 */
async function writeToFile(filePath, writeMode, content) {
  try {
    const resolvedPath = path.resolve(filePath);
    const options = writeMode === 'append' ? { flag: 'a' } : { flag: 'w' };

    await fs.writeFile(resolvedPath, content, { ...options, encoding: 'utf8' });
    console.log(`文件写入成功: ${resolvedPath}`);
  } catch (error) {
    console.error(`写入文件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取存储引擎 存储文件
 * @param {*} uploadImagePath 
 * @param {*} folderPath 
 * @returns 
 */
function getUploadEngine(uploadImagePath, folderPath) {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      if (file.mimetype.startsWith('image')) {
        cb(null, uploadImagePath);
      } else if (file.mimetype.startsWith('video')) {
        cb(null, folderPath);
      }
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
  });
  return multer({ storage: storage })
}

/**
 * 检查文件或目录是否存在
 * @param {string} targetPath - 目标路径（绝对或相对）
 * @returns {Promise<boolean>} - 是否存在
 */
async function exists(targetPath) {
  try {
    await fs.access(path.resolve(targetPath), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为文件
 * @param {string} filePath - 文件路径（绝对或相对）
 * @returns {Promise<boolean>} - 是否为文件
 */
async function isFile(filePath) {
  try {
    const stats = await fs.stat(path.resolve(filePath));
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * 检查路径是否为目录
 * @param {string} dirPath - 目录路径（绝对或相对）
 * @returns {Promise<boolean>} - 是否为目录
 */
async function isDirectory(dirPath) {
  try {
    const stats = await fs.stat(path.resolve(dirPath));
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * 确保目录存在，不存在则创建（递归创建）
 * @param {string} dirPath - 目录路径
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
  const resolvedPath = path.resolve(dirPath);
  if (!(await exists(resolvedPath))) {
    await fs.mkdir(resolvedPath, { recursive: true });
  }
}

/**
 * 读取JSON文件并返回解析后的对象
 * @param {string} filePath - 文件路径（绝对或相对）
 * @returns {Promise<Object>} - 解析后的JSON对象
 */
async function readJsonFile(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const data = await fs.readFile(resolvedPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取JSON文件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 将JSON对象写入文件
 * @param {string} filePath - 文件路径（绝对或相对）
 * @param {Object} jsonData - 要写入的JSON数据
 * @param {number} [spaces=2] - 缩进空格数
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, jsonData, spaces = 2) {
  try {
    const resolvedPath = path.resolve(filePath);
    const jsonString = JSON.stringify(jsonData, null, spaces);
    await fs.writeFile(resolvedPath, jsonString, 'utf8');
    console.log(`JSON文件已成功写入: ${resolvedPath}`);
  } catch (error) {
    console.error(`写入JSON文件失败: ${error.message}`);
    throw error;
  }
}


module.exports = {
  readFileOrDirectory,
  writeToFile,
  getUploadEngine,
  exists,
  isDirectory,
  isFile,
  ensureDirectory,
  readJsonFile,
  writeJsonFile
}; 