"""
Quick check script for Python environment
"""

import sys
import subprocess

def check_python():
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")

def check_pip_packages():
    try:
        result = subprocess.run([sys.executable, "-m", "pip", "list"], 
                              capture_output=True, text=True)
        print("\nInstalled packages:")
        print(result.stdout[:500])  # First 500 chars
    except Exception as e:
        print(f"Error checking packages: {e}")

if __name__ == "__main__":
    check_python()
    check_pip_packages()