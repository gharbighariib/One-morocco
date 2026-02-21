import os

# This is the path app.py uses
data_dir = "data"
file_path = os.path.join(data_dir, "questions.json")

print(f"Current Working Directory: {os.getcwd()}")
print(f"Looking for file at: {os.path.abspath(file_path)}")
print(f"Does file exist? {os.path.exists(file_path)}")

# Check if it's a valid JSON
if os.path.exists(file_path):
    import json

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"Success! File loaded. It contains {len(data)} regions.")
    except Exception as e:
        print(f"File exists, but error reading it: {e}")
else:
    print("\nERROR: The file is NOT found at the path above.")
    print("Checking 'data' folder contents...")
    if os.path.exists(data_dir):
        print(f"Contents of 'data' folder: {os.listdir(data_dir)}")
    else:
        print("The 'data' folder itself does not exist!")
