"""Share validated order logic between local and Vercel request handlers."""
from urllib.parse import urlsplit

from backend.server import Handler


class HostedHandler(Handler):
    def allowed_request(self):
        # Vercel provides TLS and hostname routing; retain same-origin checks.
        host = self.headers.get('Host', '')
        if not host or any(c in host for c in '/\\\r\n'):
            return False
        origin = self.headers.get('Origin')
        if origin is None:
            return True
        parsed = urlsplit(origin)
        return parsed.scheme in ['http', 'https'] and parsed.netloc == host
