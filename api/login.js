const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Joi = require('joi');
const cors = require('cors');

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// 环境变量
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET) {
  console.error('错误: JWT_SECRET环境变量未设置');
  process.exit(1);
}

// 速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: '登录尝试次数过多，请15分钟后再试'
    });
  }
});

// 输入验证schema
const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .trim()
    .escape(),
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
});

// 模拟用户数据库
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'user'
  }
];

const refreshTokens = [];

// 登录API（安全加固版）
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    // 1. 输入验证和清理
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: '输入数据格式错误'
      });
    }

    const { username, password } = value;

    // 2. 故意延迟响应，防止时序攻击
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));

    // 3. 查找用户
    const user = users.find(u => u.username === username);
    if (!user) {
      // 统一错误信息，防止用户枚举
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 4. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 5. 生成访问令牌和刷新令牌
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokens.push(refreshToken);

    // 6. 安全响应
    res.json({
      success: true,
      message: '登录成功',
      data: {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60 * 1000, // 15分钟
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 刷新令牌端点
app.post('/api/refresh-token', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken || !refreshTokens.includes(refreshToken)) {
    return res.status(403).json({
      success: false,
      message: '刷新令牌无效'
    });
  }

  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: '刷新令牌无效'
      });
    }

    const newAccessToken = jwt.sign(
      { userId: user.userId, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  });
});

// 登出端点
app.post('/api/logout', (req, res) => {
  const { refreshToken } = req.body;
  const index = refreshTokens.indexOf(refreshToken);
  if (index > -1) {
    refreshTokens.splice(index, 1);
  }
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = app;