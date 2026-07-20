const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

const dramas = [
  "최애의%20사원",
  "재벌X형사2",
  "이런%20엿같은%20사랑",
  "욕망의%20덫",
  "신병4%20:%20사보타주",
  "포핸즈"
];

const results = [];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--window-size=1920,1080'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // 伪装为真实的韩语浏览器环境
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  for (const title of dramas) {
    const rawTitle = decodeURIComponent(title);
    const targetUrl = `https://namu.wiki/w/${encodeURIComponent(rawTitle)}`;
    
    console.log(`\n====================================`);
    console.log(`正在请求: ${rawTitle}`);
    
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      
      // 强制缓冲 3 秒，留给 JS 渲染和 Cloudflare 自动跳转
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));

      const pageTitle = await page.title();
      console.log(`[页面标题]: ${pageTitle}`);

      // 检查是否被 Cloudflare 拦截
      if (pageTitle.includes('Just a moment') || pageTitle.includes('Attention Required')) {
        console.error(`⚠️ 被 Cloudflare 人机验证拦截，跳过此条。`);
        throw new Error('Cloudflare Blocked');
      }

      const data = await page.evaluate((displayTitle) => {
         const cleanText = (str) => str ? str.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() : '';

         // 基于文本关键字的精准查找算法
         const findValueByKeyword = (keyword) => {
           const allElements = Array.from(document.querySelectorAll('th, td, div, span, strong'));
           for (const el of allElements) {
             if (el.children.length === 0 && el.textContent.includes(keyword)) {
               let parentTr = el.closest('tr');
               if (parentTr) {
                 const cells = Array.from(parentTr.querySelectorAll('th, td'));
                 const idx = cells.findIndex(cell => cell.contains(el));
                 if (idx !== -1 && idx < cells.length - 1) {
                   return cleanText(cells[idx + 1].textContent);
                 }
               }
               if (el.nextElementSibling) {
                 return cleanText(el.nextElementSibling.textContent);
               }
             }
           }
           return '暂无数据';
         };

         // 自动寻找 Namu Wiki 的主图 (namu.la 静态资源库)
         let image = '';
         const imgs = Array.from(document.querySelectorAll('table img, img[src*="namu.la"]'));
         for (const img of imgs) {
            const src = img.getAttribute('src') || img.src;
            if (src && (src.includes('namu.la') || src.includes('live.namu.la')) && !src.includes('icon') && !src.includes('svg')) {
               image = src.startsWith('//') ? 'https:' + src : src;
               break;
            }
         }
         
         const period = findValueByKeyword('방송 기간');
         const count = findValueByKeyword('방송 횟수') !== '暂无数据' ? findValueByKeyword('방송 횟수') : findValueByKeyword('몇 부작');
         const stream = findValueByKeyword('스트리밍') !== '暂无数据' ? findValueByKeyword('스트리밍') : findValueByKeyword('채널');
         const langTitle = findValueByKeyword('언어별 제목') !== '暂无数据' ? findValueByKeyword('언어별 제목') : displayTitle;

         return {
            title: displayTitle,
            image: image,
            title_by_lang: langTitle,
            broadcast_period: period,
            broadcast_count: count,
            streaming: stream
         };
      }, rawTitle);
      
      results.push(data);
      console.log(`✅ 抓取结果:`, JSON.stringify(data));
    } catch (e) {
      console.error(`❌ 抓取失败 ${rawTitle}:`, e.message);
      results.push({
        title: rawTitle,
        image: '',
        title_by_lang: rawTitle,
        broadcast_period: '暂无数据',
        broadcast_count: '暂无数据',
        streaming: '暂无数据'
      });
    }
  }
  
  await browser.close();
  
  fs.writeFileSync('data.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('\n全部完成，数据已成功写入 data.json');
})();
