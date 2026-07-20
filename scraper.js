const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

// 支持直接带有 %20 或韩文原字
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
      '--no-zygote'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (const title of dramas) {
    // 先解码再编码，彻底解决二次编码 (%2520) 导致的 404 问题
    const rawTitle = decodeURIComponent(title);
    const targetUrl = `https://namu.wiki/w/${encodeURIComponent(rawTitle)}`;
    
    console.log(`正在抓取: ${rawTitle} -> ${targetUrl}`);
    
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const data = await page.evaluate((displayTitle) => {
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
         
         let image = '';
         const imgElement = document.querySelector('img[src*="namu.la"], img[class*="nu9OvS9P"]');
         if (imgElement) {
            image = imgElement.src;
            if (image.startsWith('//')) image = 'https:' + image;
         }
         
         return {
            title: displayTitle,
            image: image,
            title_by_lang: extractField('언어별 제목') || extractField('한국어') || displayTitle,
            broadcast_period: extractField('방송 기간'),
            broadcast_count: extractField('방송 횟수') || extractField('몇 부작'),
            streaming: extractField('스트리밍') || extractField('채널')
         };
      }, rawTitle);
      
      results.push(data);
      console.log(`成功抓取: ${rawTitle}`);
    } catch (e) {
      console.error(`抓取失败 ${rawTitle}:`, e.message);
      results.push({
        title: rawTitle,
        image: '',
        title_by_lang: rawTitle,
        broadcast_period: '-',
        broadcast_count: '-',
        streaming: '-'
      });
    }
  }
  
  await browser.close();
  
  fs.writeFileSync('data.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('全部完成，数据已成功写入 data.json');
})();
