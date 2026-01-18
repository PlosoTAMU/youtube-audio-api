export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    // Use cobalt.tools API - a reliable YouTube downloader service
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        isAudioOnly: true,
        filenamePattern: 'basic'
      })
    });

    if (!response.ok) {
      throw new Error(`Cobalt API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'stream' && data.status !== 'redirect') {
      return res.status(400).json({ 
        error: 'Could not extract audio',
        details: data.text || 'Unknown error'
      });
    }

    // Get title from URL or use default
    const videoID = extractVideoID(url);
    const title = `YouTube Video ${videoID}`;

    return res.status(200).json({
      title: title,
      url: data.url,
      duration: 0,
      author: 'YouTube'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
}

function extractVideoID(urlString) {
  const match = urlString.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&#?]+)/);
  return match ? match[1] : 'unknown';
}
