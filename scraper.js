const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

// 这里配置你需要抓取的剧集名称
const dramas = ["최애의_사원", "눈물의_여왕"];
const results = [];

(async () => {
  // 启动无头浏览器
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // 设置请求头模拟真实用户
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const title of dramas) {
    console.log(`正在抓取: ${title}...`);
    try {
      await page.goto(`https://namu.wiki/w/${encodeURIComponent(title)}`, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // 在浏览器环境中提取页面数据
      const data = await page.evaluate((dramaTitle) => {
         // 辅助查找表格字段的函数
         const extractField = (keyword) => {
           const elements = Array.from(document.querySelectorAll('th, td, strong'));
           const target = elements.find(el => el.textContent.includes(keyword));
           if (target) {
             let nextEl = target.nextElementSibling;
             if (nextEl) return nextEl.textContent.trim().replace(/\n/g, ' ');
             let parentNext = target.parentElement.nextElementSibling;
             if (parentNext) return parentNext.textContent.trim().replace(/\n/g, ' ');
           }
           return '暂无数据';
         };
         
         // 提取海报图片 (Namu Wiki 图片一般存在于这些结构中)
         let image = '';
         const imgElement = document.querySelector('img[src*="namu.la"], img[class*="nu9OvS9P"]');
         if (imgElement) {
            image = imgElement.src;
            if (image.startsWith('//')) image = 'https:' + image;
         }
         
         return {
            title: dramaTitle,
            image: image,
            title_by_lang: extractField('언어별 제목') || extractField('한국어'),
            broadcast_period: extractField('방송 기간'),
            broadcast_count: extractField('방송 횟수') || extractField('몇 부작'),
            streaming: extractField('스트리밍') || extractField('채널')
         };
      }, title);
      
      results.push(data);
      console.log(`成功: ${title}`);
    } catch (e) {
      console.error(`失败 ${title}:`, e.message);
      results.push({
        title: title, image: '', title_by_lang: '抓取失败', broadcast_period: '-', broadcast_count: '-', streaming: '-'
      });
    }
  }
  
  await browser.close();
  
  // 将抓取结果存入根目录的 data.json
  fs.writeFileSync('data.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('全部完成，数据已保存到 data.json');
})();
