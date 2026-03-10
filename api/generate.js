const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: '缂哄皯 prompt' });

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '鏈厤缃?API Key' });

  const postData = JSON.stringify({
    model: 'black-forest-labs/FLUX.1-schnell',
    prompt: prompt,
    image_size: '1024x576',
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5
  });

  const options = {
    hostname: 'api.siliconflow.cn',
    port: 443,
    path: '/v1/images/generations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  new Promise((resolve) => {
    const r = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          const url = (json.images && json.images[0] && json.images[0].url)
            || (json.data && json.data[0] && json.data[0].url)
            || (json.data && json.data[0] && json.data[0].b64_json ? `data:image/png;base64,${json.data[0].b64_json}` : null);
          if (url) return resolve(res.status(200).json({ imageUrl: url }));
          resolve(res.status(500).json({ error: '鐢熸垚澶辫触', detail: data }));
        } catch (e) {
          resolve(res.status(500).json({ error: '瑙ｆ瀽澶辫触', detail: data }));
        }
      });
    });
    r.on('error', e => resolve(res.status(500).json({ error: '璇锋眰澶辫触', detail: e.message })));
    r.write(postData);
    r.end();
  });
};
