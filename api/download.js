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
    // Extract video ID
    const videoID = extractVideoID(url);
    if (!videoID) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Try multiple Invidious instances for reliability
    const instances = [
      'invidious.privacyredirect.com',
      'inv.riverside.rocks',
      'invidious.snopyta.org'
    ];

    let lastError = null;

    for (const instance of instances) {
      try {
        const invidiousAPI = `https://${instance}/api/v1/videos/${videoID}`;
        
        const response = await fetch(invidiousAPI, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        });
        
        if (!response.ok) {
          lastError = `Instance ${instance} returned ${response.status}`;
          continue;
        }

        const data = await response.json();

        // Find best audio format
        const audioFormats = data.adaptiveFormats?.filter(f => 
          f.type?.startsWith('audio') || f.mimeType?.includes('audio')
        ) || [];
        
        if (audioFormats.length === 0) {
          return res.status(404).json({ error: 'No audio stream found' });
        }

        const bestAudio = audioFormats.sort((a, b) => 
          (b.bitrate || 0) - (a.bitrate || 0)
        )[0];

        return res.status(200).json({
          title: data.title,
          url: bestAudio.url,
          duration: data.lengthSeconds,
          author: data.author
        });

      } catch (err) {
        lastError = err.message;
        continue;
      }
    }

    // All instances failed
    throw new Error(`All instances failed. Last error: ${lastError}`);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
}

function extractVideoID(urlString) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&#?]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = urlString.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}
