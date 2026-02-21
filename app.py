import json
import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__)

DATA_DIR = "data"
QUESTIONS_FILE = os.path.join(DATA_DIR, "questions.json")

# --- DATABASE ---
user_progress = {}

# --- REGION CONFIGURATION ---
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

# --- HARDCODED QUESTIONS (No file needed) ---
HARDCODED_QUESTIONS = {
    "MA-01": [
        {
            "id": "MA-01_Q1",
            "question": "ما هي عاصمة منطقة طنجة تطوان الحسيمة؟",
            "options": ["طنجة", "فاس", "الرباط", "مراكش"],
            "answer": "طنجة",
            "region_id": "MA-01",
        },
        {
            "id": "MA-01_Q2",
            "question": "أين تقع منطقة طنجة تطوان الحسيمة؟",
            "options": ["شمال المغرب", "وسط المغرب", "جنوب المغرب", "شرق المغرب"],
            "answer": "شمال المغرب",
            "region_id": "MA-01",
        },
    ],
    "MA-02": [
        {
            "id": "MA-02_Q1",
            "question": "ما هي عاصمة منطقة الشرق؟",
            "options": ["وجدة", "طنجة", "أكادير", "فاس"],
            "answer": "وجدة",
            "region_id": "MA-02",
        },
        {
            "id": "MA-02_Q2",
            "question": "تقع منطقة الشرق على الحدود مع أي دولة؟",
            "options": ["الجزائر", "موريتانيا", "ليبيا", "تونس"],
            "answer": "الجزائر",
            "region_id": "MA-02",
        },
    ],
    "MA-03": [
        {
            "id": "MA-03_Q1",
            "question": "ما هي عاصمة فاس مكناس؟",
            "options": ["فاس", "مكناس", "إفران", "صفرو"],
            "answer": "فاس",
            "region_id": "MA-03",
        }
    ],
    "MA-04": [
        {
            "id": "MA-04_Q1",
            "question": "ما هي عاصمة الرباط سلا القنيطرة؟",
            "options": ["الرباط", "سلا", "القنيطرة", "سيدي قاسم"],
            "answer": "الرباط",
            "region_id": "MA-04",
        }
    ],
    "MA-05": [
        {
            "id": "MA-05_Q1",
            "question": "ما هي عاصمة بني ملال خنيفرة؟",
            "options": ["بني ملال", "خنيفرة", "أزرو", "خريبكة"],
            "answer": "بني ملال",
            "region_id": "MA-05",
        }
    ],
    "MA-06": [
        {
            "id": "MA-06_Q1",
            "question": "ما هي عاصمة الدار البيضاء سطات؟",
            "options": ["الدار البيضاء", "سطات", "الجديدة", "برشيد"],
            "answer": "الدار البيضاء",
            "region_id": "MA-06",
        }
    ],
    "MA-07": [
        {
            "id": "MA-07_Q1",
            "question": "ما هي عاصمة مراكش آسفي؟",
            "options": ["مراكش", "آسفي", "الحوز", "شيشاوة"],
            "answer": "مراكش",
            "region_id": "MA-07",
        }
    ],
    "MA-08": [
        {
            "id": "MA-08_Q1",
            "question": "ما هي عاصمة درعة تافيلالت؟",
            "options": ["ورززات", "الرشيدية", "تنغير", "زاكورة"],
            "answer": "ورززات",
            "region_id": "MA-08",
        }
    ],
    "MA-09": [
        {
            "id": "MA-09_Q1",
            "question": "ما هي عاصمة سوس ماسة؟",
            "options": ["أكادير", "أيت ملول", "تارودانت", "تزنيت"],
            "answer": "أكادير",
            "region_id": "MA-09",
        }
    ],
    "MA-10": [
        {
            "id": "MA-10_Q1",
            "question": "ما هي عاصمة كلميم واد نون؟",
            "options": ["كلميم", "السمارة", "طانطان", "أفلا"],
            "answer": "كلميم",
            "region_id": "MA-10",
        }
    ],
    "MA-11": [
        {
            "id": "MA-11_Q1",
            "question": "ما هي عاصمة العيون الساقية الحمراء؟",
            "options": ["العيون", "بوحجور", "المرسى", "طرفاية"],
            "answer": "العيون",
            "region_id": "MA-11",
        }
    ],
    "MA-12": [
        {
            "id": "MA-12_Q1",
            "question": "ما هي عاصمة الداخلة وادي الذهب؟",
            "options": ["الداخلة", "الكويرة", "لمصيرة", "بوجدور"],
            "answer": "الداخلة",
            "region_id": "MA-12",
        }
    ],
}


def initialize_user_progress():
    global user_progress
    if user_progress:
        return

    raw_questions = []

    # 1. Try to load from file
    if os.path.exists(QUESTIONS_FILE):
        try:
            with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

                # CHECK FORMAT: Is it a Dictionary {"MA-01": [...]} or List [...]?
                if isinstance(data, dict):
                    # It's a dictionary. Iterate through keys (Region IDs)
                    print("INFO: Loading questions from Dictionary format...")
                    for r_id, q_list in data.items():
                        # Add metadata
                        for q in q_list:
                            q.setdefault("state", "new")
                            q.setdefault("interval", 0)
                            q.setdefault("next_review", datetime.now().isoformat())
                            q.setdefault("mastered", False)

                        # Store directly
                        user_progress[r_id] = {
                            "unlocked": False,
                            "mastered_count": 0,
                            "total_questions": len(q_list),
                            "questions": q_list,
                        }

                elif isinstance(data, list):
                    # It's a list (old format)
                    print("INFO: Loading questions from List format...")
                    raw_questions = data

        except Exception as e:
            print(f"Error reading JSON: {e}")

    # 2. Fallback (if List format or empty)
    for region in REGIONS_ORDER:
        r_id = region["id"]

        # Only process if not already loaded from Dictionary
        if r_id not in user_progress:
            reg_questions = [q for q in raw_questions if q.get("region_id") == r_id]

            if not reg_questions:
                # Fallback to hardcoded if absolutely nothing found
                if r_id in HARDCODED_QUESTIONS:
                    reg_questions = HARDCODED_QUESTIONS[r_id]

            for q in reg_questions:
                q.setdefault("state", "new")
                q.setdefault("interval", 0)
                q.setdefault("next_review", datetime.now().isoformat())
                q.setdefault("mastered", False)

            user_progress[r_id] = {
                "unlocked": False,
                "mastered_count": 0,
                "total_questions": len(reg_questions),
                "questions": reg_questions,
            }

    # 3. Unlock first region
    if "MA-01" in user_progress:
        user_progress["MA-01"]["unlocked"] = True


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/data/regions.json")
def get_regions():
    return send_from_directory(DATA_DIR, "regions.json")


@app.route("/api/progress")
def get_progress():
    initialize_user_progress()

    map_state = {}
    for r_id, data in user_progress.items():
        if not data["unlocked"]:
            status = "locked"
        elif data["mastered_count"] >= (data["total_questions"] * 0.75):
            status = "mastered"
        else:
            status = "unlocked"
        map_state[r_id] = status

    return jsonify(map_state)


@app.route("/api/quiz/<region_id>")
def get_quiz(region_id):
    initialize_user_progress()

    # Force unlock MA-01 for testing
    if region_id == "MA-01" and region_id in user_progress:
        user_progress["MA-01"]["unlocked"] = True

    region_data = user_progress.get(region_id)

    # --- ROBUST CHECKS ---
    if not region_data:
        return jsonify({"error": "Region not found"}), 404

    if not region_data["unlocked"]:
        return jsonify({"error": "Region locked"}), 403

    if not region_data["questions"]:
        return jsonify([])  # Return empty list if no questions

    now = datetime.now()
    due_questions = [
        q
        for q in region_data["questions"]
        if not q["mastered"] and datetime.fromisoformat(q["next_review"]) <= now
    ]

    quiz_set = due_questions[:7]

    # Strip answers
    safe_quiz = []
    for q in quiz_set:
        safe_q = q.copy()
        safe_q.pop("answer", None)
        safe_quiz.append(safe_q)

    return jsonify(safe_quiz)


@app.route("/api/submit", methods=["POST"])
def submit_quiz():
    data = request.json
    region_id = data.get("region_id")
    answers = data.get("answers", [])

    region_data = user_progress.get(region_id)
    if not region_data:
        return jsonify({"error": "Invalid region"}), 404

    results = []

    for ans in answers:
        q_id = ans.get("id")
        user_ans = ans.get("user_answer")

        question = next((q for q in region_data["questions"] if q["id"] == q_id), None)
        if not question:
            continue

        correct = question["answer"] == user_ans

        if correct:
            current_interval = question.get("interval", 0)
            new_interval = 1 if current_interval == 0 else current_interval * 2
            question["interval"] = new_interval
            question["next_review"] = (
                datetime.now() + timedelta(days=new_interval)
            ).isoformat()

            if new_interval >= 21 and not question["mastered"]:
                question["mastered"] = True
                region_data["mastered_count"] += 1
        else:
            question["interval"] = 0
            question["next_review"] = datetime.now().isoformat()

        results.append(
            {"id": q_id, "correct": correct, "correct_answer": question["answer"]}
        )

    mastery_percent = region_data["mastered_count"] / region_data["total_questions"]

    response = {
        "results": results,
        "mastery_percent": mastery_percent,
        "region_unlocked": None,
    }

    if mastery_percent >= 0.75:
        current_idx = REGIONS_ORDER.index(
            next(r for r in REGIONS_ORDER if r["id"] == region_id)
        )
        next_idx = current_idx + 1
        if next_idx < len(REGIONS_ORDER):
            next_reg_id = REGIONS_ORDER[next_idx]["id"]
            if not user_progress[next_reg_id]["unlocked"]:
                user_progress[next_reg_id]["unlocked"] = True
                response["region_unlocked"] = next_reg_id

    return jsonify(response)


# ... (rest of your code) ...

if __name__ == "__main__":
    # FORCE LOADING ON STARTUP
    print("--- SERVER STARTING: Loading Questions Now... ---")
    initialize_user_progress()
    print("--- LOADING COMPLETE ---")

    app.run(debug=True, port=5000)
