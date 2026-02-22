import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta

from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__)

# --- CONFIGURATION ---
# Get absolute paths to ensure files are found
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
QUESTIONS_FILE = os.path.join(DATA_DIR, "questions.json")
DATABASE = os.path.join(BASE_DIR, "database.db")

# --- REGION DATA ---
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


# --- DATABASE FUNCTIONS ---
def get_db():
    return sqlite3.connect(DATABASE)


def init_db():
    if not os.path.exists(DATABASE):
        print(f"Creating new database at: {DATABASE}")

    with closing(get_db()) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS progress (
                question_id TEXT PRIMARY KEY,
                region_id TEXT NOT NULL,
                interval INTEGER,
                next_review TEXT,
                mastered INTEGER
            )
        """)
        db.commit()


def load_progress_from_db():
    print("--- LOADING DATA ---")
    progress = {}

    # 1. Initialize empty structure
    for region in REGIONS_ORDER:
        progress[region["id"]] = {
            "unlocked": False,
            "mastered_count": 0,
            "questions": [],
            "total_questions": 0,
        }

    # 2. Load Questions from JSON
    raw_questions = []

    print(f"Looking for questions at: {QUESTIONS_FILE}")
    if not os.path.exists(QUESTIONS_FILE):
        print("❌ ERROR: questions.json NOT FOUND at the path above!")
        print("Please ensure the file exists in the 'data' folder.")
        return progress  # Return empty to avoid crash

    try:
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            print("✅ Successfully loaded JSON file.")

            if isinstance(data, dict):
                # Format: {"MA-01": [...]}
                for r_id, q_list in data.items():
                    for q in q_list:
                        raw_questions.append(q)
            elif isinstance(data, list):
                # Format: [...]
                raw_questions = data

            print(f"Total raw questions found: {len(raw_questions)}")

    except Exception as e:
        print(f"❌ ERROR reading JSON: {e}")
        return progress

    # 3. Attach Questions to Regions
    for region in REGIONS_ORDER:
        r_id = region["id"]
        # Filter questions for this region
        reg_qs = [q for q in raw_questions if q.get("region_id") == r_id]

        # Add FSRS metadata
        for q in reg_qs:
            q.setdefault("state", "new")
            q.setdefault("interval", 0)
            q.setdefault("next_review", datetime.now().isoformat())
            q.setdefault("mastered", False)

        progress[r_id]["questions"] = reg_qs
        progress[r_id]["total_questions"] = len(reg_qs)

    # 4. Load Saved State from DB
    with closing(get_db()) as db:
        cur = db.execute(
            "SELECT question_id, region_id, interval, next_review, mastered FROM progress"
        )
        rows = cur.fetchall()

        # ... inside load_progress_from_db ...
        for row in rows:
            q_id, r_id, interval, next_review, mastered = row
            if r_id in progress:
                q = next(
                    (q for q in progress[r_id]["questions"] if q["id"] == q_id), None
                )
                if q:
                    q["interval"] = interval
                    q["next_review"] = next_review
                    q["mastered"] = bool(mastered)

                    # FIX: Count as mastered if answered correctly at least once (interval > 0)
                    if interval > 0:
                        progress[r_id]["mastered_count"] += 1

    # 5. Calculate Unlocks
    for i, region in enumerate(REGIONS_ORDER):
        r_id = region["id"]
        if i == 0:
            progress[r_id]["unlocked"] = True
        else:
            prev_id = REGIONS_ORDER[i - 1]["id"]
            prev_total = progress[prev_id]["total_questions"]
            prev_mastered = progress[prev_id]["mastered_count"]

            if prev_total > 0 and (prev_mastered / prev_total) >= 0.75:
                progress[r_id]["unlocked"] = True

    print("--- DATA LOADED SUCCESSFULLY ---")
    return progress


def save_question_to_db(q_data, region_id):
    with closing(get_db()) as db:
        db.execute(
            """INSERT OR REPLACE INTO progress
                      (question_id, region_id, interval, next_review, mastered)
                      VALUES (?, ?, ?, ?, ?)""",
            (
                q_data["id"],
                region_id,
                q_data["interval"],
                q_data["next_review"],
                int(q_data["mastered"]),
            ),
        )
        db.commit()


# --- GLOBAL STATE ---
user_progress = {}

# --- ROUTES ---


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/data/regions.json")
def get_regions():
    return send_from_directory(DATA_DIR, "regions.json")


@app.route("/api/progress")
def get_progress():
    global user_progress
    if not user_progress:
        user_progress = load_progress_from_db()

    map_state = {}
    for r_id, data in user_progress.items():
        if not data["unlocked"]:
            status = "locked"
        elif data["mastered_count"] >= (data["total_questions"] * 0.75):
            status = "mastered"
        else:
            status = "unlocked"

        total = data["total_questions"]
        mastered = data["mastered_count"]
        percent = (mastered / total * 100) if total > 0 else 0

        map_state[r_id] = {"status": status, "percent": round(percent, 1)}

    return jsonify(map_state)


@app.route("/api/dev/unlock", methods=["POST"])
def dev_unlock():
    global user_progress
    if not user_progress:
        user_progress = load_progress_from_db()
    for r_id in user_progress:
        user_progress[r_id]["unlocked"] = True
    return jsonify({"status": "success", "message": "All regions unlocked!"})


@app.route("/api/dev/reset", methods=["POST"])
def dev_reset():
    global user_progress
    user_progress = load_progress_from_db()
    return jsonify({"status": "success", "message": "Progress reset to saved state."})


@app.route("/api/quiz/<region_id>")
def get_quiz(region_id):
    global user_progress
    if not user_progress:
        user_progress = load_progress_from_db()

    if region_id == "MA-01" and region_id in user_progress:
        user_progress["MA-01"]["unlocked"] = True

    region_data = user_progress.get(region_id)

    if not region_data:
        return jsonify({"error": "Region not found"}), 404
    if not region_data["unlocked"]:
        return jsonify({"error": "Region locked"}), 403

    now = datetime.now()
    due_questions = [
        q
        for q in region_data["questions"]
        if not q["mastered"] and datetime.fromisoformat(q["next_review"]) <= now
    ]

    quiz_set = due_questions[:7]
    safe_quiz = []
    for q in quiz_set:
        safe_q = q.copy()
        safe_q.pop("answer", None)
        safe_quiz.append(safe_q)

    return jsonify(safe_quiz)


@app.route("/api/submit", methods=["POST"])
def submit_quiz():
    global user_progress
    if not user_progress:
        user_progress = load_progress_from_db()

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

            # FIX: If this is the first time getting it right (interval became 1), count it!
            if new_interval == 1 and not question["mastered"]:
                # We treat "mastered" as "learned once" for the demo
                question["mastered"] = True
                region_data["mastered_count"] += 1
        else:
            question["interval"] = 0
            question["next_review"] = datetime.now().isoformat()

        save_question_to_db(question, region_id)

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


if __name__ == "__main__":
    init_db()
    user_progress = load_progress_from_db()
    app.run(debug=True, port=5000)
