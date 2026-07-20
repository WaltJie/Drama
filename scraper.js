const fs = require('fs');
const path = require('path');

// 目标剧集列表
const dramas = [
  "최애의_사원",
  "재벌X형사2",
  "이런_엿같은_사랑",
  "욕망의_덫",
  "신병4_:_사보타주",
  "포핸즈"
];

const htmlDir = path.join(__dirname, 'html');
if (!fs.existsSync(htmlDir)) {
  fs.mkdirSync(htmlDir);
}

(async () => {
  for (const title of dramas) {
    const rawTitle = decodeURIComponent(title);
    console.log(`正在获取 HTML: ${rawTitle}...`);

    try {
      // 使用免费代理 Bridge 绕过 Cloudflare 对 GitHub 机房 IP 的直接拦截
      const targetUrl = `https://namu.wiki/w/${encodeURIComponent(rawTitle)}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

      const res = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const htmlText = await res.text();

      // 验证是否获取到了有效页面（而非 403 验证页）
      if (htmlText.includes('Just a moment...') || htmlText.length < 5000) {
        console.warn(`⚠️ ${rawTitle} 返回了验证页面或内容过短`);
      } else {
        const filePath = path.join(htmlDir, `${rawTitle}.html`);
        fs.writeFileSync(filePath, htmlText, 'utf-8');
        console.log(`✅ 成功保存 HTML 至: html/${rawTitle}.html`);
      }
    } catch (e) {
      console.error(`❌ 获取 ${rawTitle} 失败:`, e.message);
    }
  }
})();
