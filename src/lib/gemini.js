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
      maxOutputTokens: 1024,
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