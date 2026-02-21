import json
import os
import time
import urllib.error
import urllib.request

# --- CONFIGURATION ---
# Paste your Gemini API Key here
API_KEY = "YOUR_GEMINI_API_KEY"
MODEL = "gemini-1.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

REGIONS = [
    {"id": "MA-01", "ar": "طنجة تطوان الحسيمة", "en": "Tanger-Tetouan-Al Hoceima"},
    {"id": "MA-02", "ar": "الشرق", "en": "Oriental"},
    {"id": "MA-03", "ar": "فاس مكناس", "en": "Fes-Meknes"},
    {"id": "MA-04", "ar": "الرباط سلا القنيطرة", "en": "Rabat-Sale-Kenitra"},
    {"id": "MA-05", "ar": "بني ملال خنيفرة", "en": "Beni Mellal-Khenifra"},
    {"id": "MA-06", "ar": "الدار البيضاء سطات", "en": "Casablanca-Settat"},
    {"id": "MA-07", "ar": "مراكش آسفي", "en": "Marrakesh-Safi"},
    {"id": "MA-08", "ar": "درعة تافيلالت", "en": "Draa-Tafilalet"},
    {"id": "MA-09", "ar": "سوس ماسة", "en": "Souss-Massa"},
    {"id": "MA-10", "ar": "كلميم واد نون", "en": "Guelmim-Oued Noun"},
    {"id": "MA-11", "ar": "العيون الساقية الحمراء", "en": "Laayoune-Sakia El Hamra"},
    {"id": "MA-12", "ar": "الداخلة وادي الذهب", "en": "Dakhla-Oued Ed-Dahab"},
]


def generate_for_region(region):
    print(f"Generating for {region['ar']}...")

    prompt = f"""
    You are an educational AI. Generate 3 questions in Arabic about the Moroccan region: {region["ar"]} ({region["en"]}).
    Topics: Geography, History, Culture.
    Return ONLY a valid JSON array.
    Schema: [{{ "id": "{region["id"]}_Q1", "question": "...?", "options": ["...", "...", "...", "..."], "answer": "...", "region_id": "{region["id"]}" }}]
    """

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    data = json.dumps(payload).encode("utf-8")

    try:
        req = urllib.request.Request(
            URL, data=data, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))

            text = result["candidates"][0]["content"]["parts"][0]["text"]

            # Clean markdown
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            return json.loads(text.strip())
    except Exception as e:
        print(f"Error: {e}")
        return []


def main():
    all_questions = []

    for region in REGIONS:
        qs = generate_for_region(region)
        all_questions.extend(qs)
        print(f" -> Collected {len(qs)} questions.")
        time.sleep(1)

    if not os.path.exists("data"):
        os.makedirs("data")

    with open("data/questions.json", "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nSUCCESS! Total questions: {len(all_questions)}")
    print("File saved to: data/questions.json")


if __name__ == "__main__":
    main()
