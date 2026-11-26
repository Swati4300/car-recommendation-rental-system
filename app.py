"""
Root-level app.py shim for Render deployment.
Adds backend/ to sys.path so gunicorn app:app works from the repo root.
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import the Flask app from backend/app.py
from app import app

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
