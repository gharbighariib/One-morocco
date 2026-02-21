// generate_questions.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// ideally load from environment variable: process.env.GEMINI_API_KEY
const API_KEY = "AIzaSyDz9GHDo2CppUkkx_06h4eUQeq9nXbQrBY"; // Replace with your new key after revoking the old one
const genAI = new GoogleGenerativeAI(API_KEY);

// The model to use (Flash is fast and cheap, Pro is smarter)
const model = genAI.getGenerativeModel({ model: "gemini-2-flash" });

const REGIONS = [
    { id: "ttah", ar: "طنجة تطوان الحسيمة", en: "Tanger-Tetouan-Al Hoceima" },
    { id: "loriental", ar: "الشرق", en: "Oriental" },
    { id: "fm", ar: "فاس مكناس", en: "Fes-Meknes" },
    { id: "rsk", ar: "الرباط سلا القنيطرة", en: "Rabat-Sale-Kenitra" },
    { id: "bmk", ar: "بني ملال خنيفرة", en: "Beni Mellal-Khenifra" },
    { id: "cs", ar: "الدار البيضاء سطات", en: "Casablanca-Settat" },
    { id: "ms", ar: "مراكش آسفي", en: "Marrakesh-Safi" },
    { id: "dt", ar: "درعة تافيلالت", en: "Draa-Tafilalet" },
    { id: "sm", ar: "سوس ماسة", en: "Souss-Massa" },
    { id: "gon", ar: "كلميم واد نون", en: "Guelmim-Oued Noun" },
    { id: "lseh", ar: "العيون الساقية الحمراء", en: "Laayoune-Sakia El Hamra" },
    { id: "dod", ar: "الداخلة وادي الذهب", en: "Dakhla-Oued Ed-Dahab" }
];

const OUTPUT_FILE = path.join(__dirname, 'data', 'questions.json');

async function generateQuestionsForRegion(region) {
    console.log(`🚀 Generating questions for: ${region.ar}...`);

    const prompt = `
You are an educational AI generating **Moroccan regional quizzes** in Arabic.
Follow these instructions **strictly**:

1. Generate exactly **30 questions** for the region: **${region.ar} (${region.en})**.
2. Questions must cover these domains:
   - Geography (location, borders, coordinates)
   - History (important events, independence, key figures)
   - Culture (festivals, food, music, dialects)
   - Landmarks / monuments / tourism
   - Major cities and economy
   - Fun facts & trivia
3. Each question object must have:
   - "id": unique string (e.g., "${region.id}_Q1")
   - "question": Arabic text
   - "options": array of 4 strings in Arabic
   - "answer": exact string matching the correct option
4. Return **ONLY a valid JSON array**. No markdown, no explanation.

Example format:
[
  {
    "id": "${region.id}_Q1",
    "question": "ما هي عاصمة منطقة ${region.ar}؟",
    "options": ["طنجة", "فاس", "الرباط", "مراكش"],
    "answer": "طنجة"
  }
]

Now, generate the 30 questions for ${region.ar}.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up potential markdown code blocks if the model adds them
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parse to ensure valid JSON
        const questions = JSON.parse(text);

        // Tag with region ID (double safety)
        const taggedQuestions = questions.map((q, i) => ({
            ...q,
            id: q.id || `${region.id}_Q${i+1}`, // Ensure ID exists
            region_id: region.id
        }));

        console.log(`✅ Success: Generated ${taggedQuestions.length} questions for ${region.ar}`);
        return taggedQuestions;

    } catch (error) {
        console.error(`❌ Error generating for ${region.ar}:`, error.message);
        return []; // Return empty on failure so the script continues
    }
}

async function main() {
    let allQuestions = [];

    for (const region of REGIONS) {
        const qs = await generateQuestionsForRegion(region);
        allQuestions = allQuestions.concat(qs);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2), 'utf-8');
    console.log(`\n🎉 ALL DONE! Total questions saved: ${allQuestions.length}`);
    console.log(`📁 File location: ${OUTPUT_FILE}`);
}

main();
