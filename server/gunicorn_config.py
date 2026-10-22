"""Gunicorn configuration file for MetaRoboLearn server."""
import os
import logging

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
# Using 3 workers for redundancy - if one dies, others can handle requests
# With Redis-based token sharing, multiple workers are safe
workers = 3
worker_class = "gevent"
worker_connections = 1000
threads = 1

# Timeouts
timeout = 300  # 5 minutes - increased for long-running WebSocket connections
graceful_timeout = 60  # Give workers 60 seconds to finish current requests
keepalive = 5

# Logging
loglevel = os.environ.get("LOG_LEVEL", "info").lower()
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "mrl-app-server"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Preload app to save memory
preload_app = False  # Keep False to avoid issues with gevent

# Server hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    logging.info("Starting Gunicorn server with %d workers", workers)

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    logging.info("Reloading Gunicorn server")

def when_ready(server):
    """Called just after the server is started."""
    logging.info("Gunicorn server is ready. Spawning workers")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    pass

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    logging.info(f"Worker spawned (pid: {worker.pid})")

def worker_int(worker):
    """Called when worker receives the INT or QUIT signal."""
    logging.info(f"Worker interrupted (pid: {worker.pid})")

def worker_abort(worker):
    """Called when a worker receives the SIGABRT signal."""
    logging.warning(f"Worker aborted (pid: {worker.pid})")

