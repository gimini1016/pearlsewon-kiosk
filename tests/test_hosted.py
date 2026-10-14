from email.message import Message
import unittest
from unittest.mock import patch

from backend.vercel_handler import HostedHandler
from api.health import handler as HealthHandler


class HostedRequests(unittest.TestCase):
    def request(self, host, origin=None):
        h = object.__new__(HostedHandler)
        h.headers = Message()
        h.headers['Host'] = host
        if origin is not None:
            h.headers['Origin'] = origin
        return h

    def test_same_origin_production(self):
        self.assertTrue(self.request('pearlsewon-kiosk.vercel.app','https://pearlsewon-kiosk.vercel.app').allowed_request())

    def test_other_origin_rejected(self):
        self.assertFalse(self.request('pearlsewon-kiosk.vercel.app','https://other.example').allowed_request())
        self.assertFalse(self.request('pearlsewon-kiosk.vercel.app','null').allowed_request())

    def test_invalid_hosts_rejected(self):
        self.assertFalse(self.request('').allowed_request())
        self.assertFalse(self.request('bad/host').allowed_request())

    def test_health_does_not_return_secret(self):
        h=object.__new__(HealthHandler)
        h.headers=Message();h.headers['Host']='pearlsewon-kiosk.vercel.app'
        output=[];h.json_response=lambda status,data:output.append((status,data))
        with patch('api.health.settings',return_value={'key':'never-return-this','model':'gpt-4.1-mini'}):h.do_GET()
        self.assertEqual(output[0][0],200)
        self.assertNotIn('never-return-this',str(output))


if __name__=='__main__':unittest.main()
