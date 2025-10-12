#!/usr/bin/env python3
"""
Finance AI ML Server Startup Script
"""

import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_dependencies():
    """Install Python dependencies"""
    try:
        logger.info("Installing minimal dependencies for immediate testing...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements-minimal.txt"])
        logger.info("Minimal dependencies installed successfully!")
        
        logger.info("Attempting to install ML dependencies (optional)...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn", "pandas", "numpy", "nltk"], timeout=300)
            logger.info("ML dependencies installed successfully!")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            logger.warning(f"ML dependencies failed to install: {e}")
            logger.info("Server will run with rule-based categorization")
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install minimal dependencies: {e}")
        sys.exit(1)

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python {version.major}.{version.minor}.{version.micro} detected ✓")

def main():
    """Main startup function"""
    logger.info("🚀 Starting Finance AI ML Server...")
    
    # Check Python version
    check_python_version()
    
    # Install dependencies
    install_dependencies()
    
    # Start the server
    logger.info("Starting FastAPI server on http://localhost:8000")
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except ImportError:
        logger.error("FastAPI/Uvicorn not installed. Run: pip install -r requirements.txt")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()