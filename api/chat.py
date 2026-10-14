from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.vercel_handler import HostedHandler


class handler(HostedHandler):
    def do_GET(self):
        self.json_response(405, {'error': '주문 메시지는 POST로 보내 주세요.'})
