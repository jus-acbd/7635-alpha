// 检查登录状态
function checkLogin() {
    const token = localStorage.getItem('token');
    return token !== null;
}

// 显示消息
function showMessage(message, type = 'error') {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
    }
}

// 登录表单处理
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const button = document.querySelector('.login-btn');
        
        // 禁用按钮防止重复提交
        button.disabled = true;
        button.textContent = '登录中...';
        
        try {
            // 调用Vercel云函数（相对路径）
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 登录成功，保存token
                localStorage.setItem('token', data.token);
                showMessage('登录成功！正在跳转...', 'success');
                
                // 跳转到受保护的页面
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showMessage(data.message || '登录失败！');
            }
        } catch (error) {
            showMessage('网络错误，请稍后重试');
            console.error('Login error:', error);
        } finally {
            // 恢复按钮
            button.disabled = false;
            button.textContent = '登录';
        }
    });
}

// 通用的退出函数
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}