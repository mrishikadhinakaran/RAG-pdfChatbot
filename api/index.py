# Vercel entrypoint for the FastAPI application
import os
import sys

# Add the backend directory to the Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
sys.path.insert(0, backend_path)

# Print paths for debugging
print(f"Backend path: {backend_path}")
print(f"Sys path: {sys.path}")

# Import the FastAPI app from main.py
from main import app

# Vercel expects the application to be available as 'app'
# This is already the case in your main.py, so we just re-export it