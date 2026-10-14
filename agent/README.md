# SecureMonitor AI Windows Laptop Agent

This agent reads real Windows system metrics locally with `psutil`: CPU %, RAM %, C: disk %, running process count, and network upload/download MB since the previous poll.

1. Sign in to https://securemonitor-ai.onrender.com
2. Open **Devices** and click **Connect Laptop Agent**. Copy the `smk_...` device key. Treat it like a password.
3. On this Windows laptop, run `run_windows_agent.bat`, or from this folder run `py -m pip install psutil` and then `py laptop_agent.py`.
4. Enter the API URL, one-time key, and a device ID when prompted.
5. Keep the terminal open. Press Ctrl+C to stop monitoring.

This agent only sends measurements. It does not kill processes, delete files, or change Windows settings.
