import ytdl from '@distube/ytdl-core';
import { Agent } from 'undici';

// Configure agent with cookies for better YouTube access
const agent = new Agent({
  pipelining: 0,
});

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
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video info with agent and disable debug file writing
    const info = await ytdl.getInfo(url, {
      agent,
      // Disable file writing that causes EROFS error
      debug: false,
    });
    
    // Get audio formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'No audio stream found' });
    }

    // Sort by quality and get best
    const bestAudio = audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0];

    return res.status(200).json({
      title: info.videoDetails.title,
      url: bestAudio.url,
      duration: info.videoDetails.lengthSeconds,
      author: info.videoDetails.author.name
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process video',
      details: error.message 
    });
  }
}
