const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const MODEL = "gemini-2.5-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function sendMessageToGemini(messages, systemPrompt) {
  const contents = messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.log(data);
    throw new Error(data?.error?.message || "Gemini API error");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateWeeklyMenu(healthProfile) {
  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const profileInfo = healthProfile ? `
Profil de santé :
- Poids : ${healthProfile.poids} kg
- Taille : ${healthProfile.taille} cm  
- IMC : ${healthProfile.imc}
- Pathologies : ${healthProfile.pathologies?.join(", ") || "aucune"}
- Objectifs : ${healthProfile.objectifs?.join(", ") || "aucun"}
- Allergies : ${healthProfile.allergies?.join(", ") || "aucune"}
` : "Profil de santé non renseigné — génère un menu équilibré général.";

  const prompt = `Tu es un nutritionniste expert spécialisé dans la cuisine malgache et les produits locaux de Madagascar.

${profileInfo}

Génère un menu complet et varié pour 7 jours (Lundi à Dimanche), adapté au profil ci-dessus.
Utilise des produits locaux malgaches quand c'est possible (vary, ravitoto, brèdes, poissons locaux, légumes locaux, fruits tropicaux, etc.).

RÉPONDS UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans backticks, sans markdown.
Le JSON doit avoir exactement cette structure :

{
  "semaine": [
    {
      "jour": "Lundi",
      "petitDejeuner": {
        "plat": "Nom du plat",
        "description": "Description courte",
        "calories": 350,
        "emoji": "🍌"
      },
      "dejeuner": {
        "plat": "Nom du plat",
        "description": "Description courte",
        "calories": 550,
        "emoji": "🍚"
      },
      "diner": {
        "plat": "Nom du plat",
        "description": "Description courte",
        "calories": 450,
        "emoji": "🐟"
      },
      "collation": {
        "plat": "Nom du plat",
        "description": "Description courte",
        "calories": 150,
        "emoji": "🥭"
      },
      "totalCalories": 1500,
      "conseil": "Un conseil nutritionnel court pour cette journée"
    }
  ]
}

Génère les 7 jours complets. Varie les repas chaque jour.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini API error");

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Nettoyer et parser le JSON
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}