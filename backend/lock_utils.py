import os
import time
import uuid
import threading

# Thread-safe in-memory lock store fallback
_local_locks = {}
_local_lock_guard = threading.Lock()

# Redis initialization with graceful fallback
try:
    import redis
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_client = redis.Redis(
        host=redis_host,
        port=redis_port,
        db=0,
        socket_timeout=1.0,
        socket_connect_timeout=1.0
    )
    redis_client.ping()
    HAS_REDIS = True
    print(f"--- Redis Distributed Lock Active ({redis_host}:{redis_port}) ---")
except Exception:
    HAS_REDIS = False
    redis_client = None
    print("--- Redis unavailable; using In-Memory Concurrency Lock Fallback ---")


class DistributedLock:
    """
    Distributed Lock implementation with Redis SETNX and local thread lock fallback.
    Prevents race conditions when concurrent requests target the same resource (e.g., booking the same car).
    """
    def __init__(self, resource_name, expire_seconds=10):
        self.resource_key = f"lock:{resource_name}"
        self.expire = expire_seconds
        self.token = str(uuid.uuid4())
        self.acquired = False

    def acquire(self, blocking=False, timeout=5):
        start_time = time.time()
        while True:
            # 1. Attempt Redis Lock (SETNX with Expiration)
            if HAS_REDIS and redis_client:
                try:
                    res = redis_client.set(self.resource_key, self.token, nx=True, ex=self.expire)
                    if res:
                        self.acquired = True
                        return True
                except Exception:
                    pass

            # 2. Local Fallback Lock
            with _local_lock_guard:
                if self.resource_key not in _local_locks:
                    _local_locks[self.resource_key] = threading.Lock()
                lock = _local_locks[self.resource_key]

            if lock.acquire(blocking=False):
                self.acquired = True
                return True

            if not blocking or (time.time() - start_time) >= timeout:
                break
            time.sleep(0.05)

        return False

    def release(self):
        if not self.acquired:
            return

        # 1. Release Redis Lock safely using token check
        if HAS_REDIS and redis_client:
            try:
                script = """
                if redis.call('get', KEYS[1]) == ARGV[1] then
                    return redis.call('del', KEYS[1])
                else
                    return 0
                end
                """
                redis_client.eval(script, 1, self.resource_key, self.token)
            except Exception:
                pass

        # 2. Release Local Lock
        with _local_lock_guard:
            lock = _local_locks.get(self.resource_key)
            if lock and lock.locked():
                try:
                    lock.release()
                except RuntimeError:
                    pass
        self.acquired = False

    def __enter__(self):
        self.acquire(blocking=True)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
