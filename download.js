const fs = require('fs');
const path = require('path');

const dramas = [
  "최애의_사원",
  "재벌X형사2",
  "이런_엿같은_사랑",
  "욕망의_덫",
  "신병4_:_사보타주",
  "포핸즈"
];

const htmlDir = path.join(__dirname, 'html');

// 确保 html 文件夹存在
if (!fs.existsSync(htmlDir)) {
  fs.mkdirSync(htmlDir, { recursive: true });
}

// 延迟函数，防止触发代理限流
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log("====================================");
  console.log(`🚀 开始抓取 ${dramas.length} 个 HTML 页面...`);
  console.log("====================================\n");

  for (let i = 0; i < dramas.length; i++) {
    const title = dramas[i];
    const rawTitle = decodeURIComponent(title);
    const fileName = `${rawTitle}.html`;
    const filePath = path.join(htmlDir, fileName);

    console.log(`[${i + 1}/${dramas.length}] 正在获取: ${rawTitle}`);

    const targetUrl = `https://namu.wiki/w/${encodeURIComponent(rawTitle)}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    try {
      const res = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP 状态码: ${res.status}`);
      }

      const htmlText = await res.text();
      fs.writeFileSync(filePath, htmlText, 'utf-8');
      console.log(`  └─ ✅ 成功保存 html/${fileName} (${htmlText.length} 字节)`);

    } catch (e) {
      console.error(`  └─ ❌ 获取失败: ${e.message}`);
      // 写入保底调试文件，确保 git 能够捕捉到目录更改
      const errorHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${rawTitle}</title></head><body><h1>Fetch Failed</h1><p>${e.message}</p></body></html>`;
      fs.writeFileSync(filePath, errorHtml, 'utf-8');
    }

    // 每次请求完成后强制间隔 3 秒，避免代理服务拦截
    if (i < dramas.length - 1) {
      console.log(`  ⏳ 缓冲中，等待 3 秒...`);
      await sleep(3000);
    }
  }

  console.log("\n====================================");
  console.log("🎉 所有页面处理完成！");
  console.log("====================================");
})();
