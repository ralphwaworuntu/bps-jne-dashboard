
import uvicorn

if __name__ == "__main__":
    print("Starting server with increased timeout settings (300s)...")
    # Increase timeout_keep_alive to 300 seconds (5 minutes) to allow large file uploads
    # Ensure allow_origins is set in main.py (it is)
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True, 
        timeout_keep_alive=300,
        limit_concurrency=100
    )
