import os

# Owner key — only someone with this key can register new drivers.
# Set via environment variable or use the default for local dev.
OWNER_KEY = os.environ.get("SMART_CAR_OWNER_KEY", "owner-secret-123")
