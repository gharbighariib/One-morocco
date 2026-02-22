import json
import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__)

DATA_DIR = "data"
QUESTIONS_FILE = os.path.join(DATA_DIR, "questions.json")


# --- LOAD QUESTIONS (Read Only) ---
def load_questions():
    if not os.path.exists(QUESTIONS_FILE):
        return []
    with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        # Flatten dictionary if needed
        if isinstance(data, dict):
            all_qs = []
            for r_id, q_list in data.items():
                all_qs.extend(q_list)
            return all_qs
        return data


REGIONS_ORDER = [
    {"id": "MA-01", "name_ar": "طنجة تطوان الحسيمة"},
    {"id": "MA-02", "name_ar": "الشرق"},
    {"id": "MA-03", "name_ar": "فاس مكناس"},
    {"id": "MA-04", "name_ar": "الرباط سلا القنيطرة"},
    {"id": "MA-05", "name_ar": "بني ملال خنيفرة"},
    {"id": "MA-06", "name_ar": "الدار البيضاء سطات"},
    {"id": "MA-07", "name_ar": "مراكش آسفي"},
    {"id": "MA-08", "name_ar": "درعة تافيلالت"},
    {"id": "MA-09", "name_ar": "سوس ماسة"},
    {"id": "MA-10", "name_ar": "كلميم واد نون"},
    {"id": "MA-11", "name_ar": "العيون الساقية الحمراء"},
    {"id": "MA-12", "name_ar": "الداخلة وادي الذهب"},
]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/data/regions.json")
def get_regions():
    return send_from_directory(DATA_DIR, "regions.json")


@app.route("/api/questions")
def get_all_questions():
    # Returns all questions so the frontend can manage them
    return jsonify(load_questions())


@app.route("/api/regions")
def get_regions_info():
    return jsonify(REGIONS_ORDER)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
