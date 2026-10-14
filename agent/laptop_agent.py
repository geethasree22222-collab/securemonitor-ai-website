"""SecureMonitor AI Windows laptop telemetry agent.
Collects actual local OS metrics with psutil and posts them to SecureMonitor AI.
Run: py -m pip install psutil && py laptop_agent.py
"""
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

try:
    import psutil
except ImportError:
    raise SystemExit("Missing psutil. Run: py -m pip install psutil")

DEFAULT_API = "https://securemonitor-ai.onrender.com"
POLL_SECONDS = max(10, int(os.getenv("SECUREMONITOR_POLL_SECONDS", "30")))


def ask(label, default=""):
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or default


def send(url, key, payload):
    request = urllib.request.Request(
        url.rstrip("/") + "/api/telemetry/laptop",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Device-Key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", "replace")
            return response.status, body
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def main():
    base_url = ask("SecureMonitor API URL", os.getenv("SECUREMONITOR_API_URL", DEFAULT_API))
    key = ask("Device key (from Dashboard > Devices > Connect Laptop Agent)", os.getenv("SECUREMONITOR_DEVICE_KEY", ""))
    device_id = ask("Device ID", os.getenv("SECUREMONITOR_DEVICE_ID", "laptop-windows-001"))
    if not key.startswith("smk_"):
        raise SystemExit("Device key should begin with smk_. Sign in to the dashboard and generate a new key.")
    if not device_id.replace("-", "").replace("_", "").isalnum() or len(device_id) > 64:
        raise SystemExit("Device ID may contain only letters, numbers, underscores, and hyphens (max 64 characters).")

    root = os.getenv("SystemDrive", "C:") + "\\"
    previous = psutil.net_io_counters()
    previous_time = time.monotonic()
    print(f"SecureMonitor AI laptop agent started for {device_id}.")
    print(f"Sending real Windows metrics to {base_url} every {POLL_SECONDS}s. Press Ctrl+C to stop.\n")
    try:
        while True:
            cpu = round(psutil.cpu_percent(interval=1), 1)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage(root)
            processes = len(psutil.pids())
            current = psutil.net_io_counters()
            now = time.monotonic()
            elapsed = max(now - previous_time, 1)
            upload_mb = round(max(0, current.bytes_sent - previous.bytes_sent) / 1048576, 3)
            download_mb = round(max(0, current.bytes_recv - previous.bytes_recv) / 1048576, 3)
            payload = {
                "deviceId": device_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "cpu": cpu,
                "ram": round(mem.percent, 1),
                "disk": round(disk.percent, 1),
                "upload_mb": upload_mb,
                "download_mb": download_mb,
                "processes": processes,
            }
            status, response = send(base_url, key, payload)
            print(
                f"{payload['timestamp']} | CPU {cpu}% | RAM {payload['ram']}% | "
                f"Disk {payload['disk']}% | Processes {processes} | "
                f"Upload {upload_mb} MB / Download {download_mb} MB | HTTP {status}"
            )
            if status not in (200, 202):
                print("Backend response:", response[:500])
                if status == 401:
                    print("The device key is invalid/expired. Generate a new key in the dashboard and restart this agent.")
            previous, previous_time = current, now
            time.sleep(max(0, POLL_SECONDS - 1))
    except KeyboardInterrupt:
        print("\nSecureMonitor AI laptop agent stopped.")


if __name__ == "__main__":
    main()
