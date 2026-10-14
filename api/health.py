from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.vercel_handler import HostedHandler
from backend.server import settings


class handler(HostedHandler):
    def do_GET(self):
        if not self.allowed_request():
            return self.json_response(403, {'error': '요청 출처를 확인할 수 없어요.'})
        config = settings()
        self.json_response(200, {'configured': bool(config['key']), 'model': config['model'], 'mode': 'llm-rag'})

    def do_POST(self):
        self.json_response(405, {'error': '상태 확인은 GET으로 요청해 주세요.'})
