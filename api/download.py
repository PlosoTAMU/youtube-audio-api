from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import yt_dlp
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse URL and get query parameters
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        # Enable CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()
        
        # Get URL from query params
        if 'url' not in query_params:
            self.wfile.write(json.dumps({
                'error': 'URL parameter required'
            }).encode())
            return
        
        youtube_url = query_params['url'][0]
        
        try:
            # Configure yt-dlp
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            
            # Extract info without downloading
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                
                # Get direct audio URL
                if 'url' in info:
                    audio_url = info['url']
                elif 'entries' in info:
                    # Playlist case - get first video
                    audio_url = info['entries'][0]['url']
                else:
                    # Find best audio format
                    formats = info.get('formats', [])
                    audio_formats = [f for f in formats if f.get('acodec') != 'none']
                    if audio_formats:
                        audio_url = audio_formats[0]['url']
                    else:
                        raise Exception('No audio format found')
                
                result = {
                    'title': info.get('title', 'Unknown'),
                    'url': audio_url,
                    'duration': info.get('duration', 0),
                    'author': info.get('uploader', 'Unknown')
                }
                
                self.wfile.write(json.dumps(result).encode())
                
        except Exception as e:
            self.wfile.write(json.dumps({
                'error': 'Failed to process video',
                'details': str(e)
            }).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
