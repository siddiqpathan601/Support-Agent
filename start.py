import os
import sys
import subprocess
import time
import signal

processes = []

def cleanup(signum, frame):
    print("[StartScript] Shutting down services gracefully...")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)

# Register signal handlers for graceful container termination
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    try:
        # 1. Fetch the target port (defaulting to Hugging Face Spaces standard 7860)
        target_port = os.getenv("PORT", "7860").strip()
        print(f"[StartScript] Target deployment port resolved: {target_port}")

        # 2. Update Nginx configuration file
        nginx_conf_path = "/etc/nginx/nginx.conf"
        if os.path.exists(nginx_conf_path):
            with open(nginx_conf_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Clean possible carriage returns and replace the placeholder
            content = content.replace("\r\n", "\n").replace("LISTEN_PORT", target_port)
            
            with open(nginx_conf_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("[StartScript] Nginx configuration updated successfully.")
        else:
            print("[StartScript] Error: nginx.conf not found at /etc/nginx/nginx.conf")
            sys.exit(1)

        # 3. Start Nginx
        print("[StartScript] Launching Nginx...")
        nginx_proc = subprocess.Popen(["nginx", "-g", "daemon off;"])
        processes.append(nginx_proc)

        # 4. Start FastAPI backend (forced to local port 8081 to avoid host port collisions)
        print("[StartScript] Launching FastAPI backend on internal port 8081...")
        backend_env = os.environ.copy()
        backend_env["PORT"] = "8081"
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "backend.main"],
            env=backend_env
        )
        processes.append(backend_proc)

        # 5. Start Next.js frontend (forced to local port 3000)
        print("[StartScript] Launching Next.js frontend on internal port 3000...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "start", "--prefix", "frontend", "--", "--port", "3000"]
        )
        processes.append(frontend_proc)

        # 6. Keep monitoring all processes
        print("[StartScript] All processes online. Monitoring...")
        while True:
            for p in processes:
                ret = p.poll()
                if ret is not None:
                    print(f"[StartScript] Process terminated: {p.args} exited with code {ret}")
                    cleanup(None, None)
            time.sleep(2)

    except Exception as e:
        print(f"[StartScript] Error during execution: {e}")
        cleanup(None, None)

if __name__ == "__main__":
    main()
