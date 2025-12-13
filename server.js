const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();

// 1. 跨平台自动打开浏览器函数
function openUrl(url) {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
    exec(`${start} "${url}"`);
}

// 2. 获取局域网 IP
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (let devName in interfaces) {
        let iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

// 3. 核心：静态资源拦截器（实现单文件嵌入的关键）
app.get('/*', async (req, res) => {
    // 处理请求路径，默认为 index.html
    let reqPath = req.path === '/' ? '/index.html' : req.path;

    // 这里的路径必须在构建时能找到对应的 docs 目录
    // Bun 编译时会自动将 Bun.file 引用的静态资源打包进去
    const filePath = path.join(__dirname, "docs", reqPath);
    const file = Bun.file(filePath);

    if (await file.exists()) {
        res.type(file.type);
        res.send(Buffer.from(await file.arrayBuffer()));
    } else {
        // Vue History 模式支持：找不到的文件指向 index.html
        const indexFile = Bun.file(path.join(__dirname, "docs", "index.html"));
        res.type('text/html');
        res.send(Buffer.from(await indexFile.arrayBuffer()));
    }
});

// 4. 启动服务器（随机端口）
const server = app.listen(0, '0.0.0.0', () => {
    const { port } = server.address();
    const url = `http://localhost:${port}`;
    const lanUrl = `http://${getLocalIp()}:${port}`;

    console.log("-----------------------------------");
    console.log(`🚀 OGame 程序已启动！`);
    console.log(`🔗 本地访问: ${url}`);
    console.log(`🌐 局域网访问: ${lanUrl}`);
    console.log("-----------------------------------");
    console.log("提示: 关闭此窗口将停止服务。");

    openUrl(url);
});