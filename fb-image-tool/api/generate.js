const https = require('https');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: '缺少 prompt 参数' });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '未配置 API Key' });
  }

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

  return new Promise((resolve) => {
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => { data += chunk; });
      apiRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.images && result.images.length > 0) {
            resolve(res.status(200).json({ 
              imageUrl: result.images[0].url 
            }));
          } else if (result.data && result.data.length > 0) {
            resolve(res.status(200).json({ 
              imageUrl: result.data[0].url || (result.data[0].b64_json ? `data:image/png;base64,${result.data[0].b64_json}` : null)
            }));
          } else {
            resolve(res.status(500).json({ error: '生成失败', detail: data }));
          }
        } catch (e) {
          resolve(res.status(500).json({ error: '解析响应失败', detail: data }));
        }
      });
    });

    apiReq.on('error', (e) => {
      resolve(res.status(500).json({ error: '请求失败', detail: e.message }));
    });

    apiReq.write(postData);
    apiReq.end();
  });
};
