"""
Root-level app.py shim for Render deployment.
Uses importlib to load backend/app.py directly — avoids circular import
since both files share the name 'app'.
"""
import importlib.util
import sys
import os

# Load backend/app.py by file path under a unique module name
_backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'app.py')
_spec = importlib.util.spec_from_file_location('backend_app', _backend_path)
_module = importlib.util.module_from_spec(_spec)
sys.modules['backend_app'] = _module
_spec.loader.exec_module(_module)

# Expose the Flask instance as 'app' so gunicorn app:app works
app = _module.app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
