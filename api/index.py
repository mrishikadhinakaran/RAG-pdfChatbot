# Vercel entrypoint for the FastAPI application
import os
import sys

# Add the backend directory to the Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))
sys.path.insert(0, backend_path)

# Print paths for debugging
print(f"Backend path: {backend_path}")
print(f"Sys path: {sys.path}")

# Import the FastAPI app from main.py in the backend directory
# Using importlib to make the import more explicit to static analysis tools
import importlib.util
import sys

# Construct the full path to main.py
main_path = os.path.join(backend_path, 'main.py')

# Load the module dynamically
spec = importlib.util.spec_from_file_location("main", main_path)
if spec and spec.loader:
    main_module = importlib.util.module_from_spec(spec)
    sys.modules["main"] = main_module
    spec.loader.exec_module(main_module)
    
    # Get the app from the loaded module
    app = main_module.app
else:
    raise ImportError("Could not load main module")

# Vercel expects the application to be available as 'app'