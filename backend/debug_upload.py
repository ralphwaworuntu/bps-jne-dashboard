
import requests
import os

# Create a small test file
with open("small_test.xlsx", "wb") as f:
    f.write(b"Test content")

url = "http://localhost:8000/upload-allshipment"
files = {'file': ('small_test.xlsx', open('small_test.xlsx', 'rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
# Assuming you have a way to get token or I can temporarily bypass auth for this test? 
# Ah, I need a token. Let's try to login first if I can, or just assert headers.
# Actually simpler: I'll just check if the server responds at all.
# But wait, the endpoint is protected. 
# Plan B: Inspect the code to see if there is a file size limit config.

print("Test script created. Run me if you have a valid token.")
