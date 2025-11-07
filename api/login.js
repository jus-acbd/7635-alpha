import crypto from 'crypto';

// 简单的JWT生成
function generateToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');
  
  return `${header}.${payloadEncoded}.${signature}`;
}

export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', username);
    
    // 验证用户
    const validUsers = {
      'admin': '123456',
      'user': 'password', 
      'github': 'github123'
    };
    
    if (validUsers[username] && validUsers[username] === password) {
      // 生成JWT Token
      const payload = {
        username: username,
        userId: username === 'admin' ? 1 : 2,
        exp: Date.now() + (24 * 60 * 60 * 1000)
      };
      
      const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
      const token = generateToken(payload, secret);
      
      console.log('Login successful:', username);
      
      return res.status(200).json({
        success: true,
        token: token,
        user: { username: username }
      });
    } else {
      console.log('Login failed:', username);
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}