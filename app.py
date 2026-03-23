from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

# Configuration
DATA_DIR = 'data'

@app.route('/')
def index():
    return render_template('index.html')

# Serving Data Files
@app.route('/data/<path:filename>')
def get_data(filename):
    return send_from_directory(DATA_DIR, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
