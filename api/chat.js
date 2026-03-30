export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { messages, max_tokens = 1024 } = req.body;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://revizbot.vercel.app",
        "X-Title": "RevizBot"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        max_tokens,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "API error" });
    }

    return res.status(200).json({
      content: data?.choices?.[0]?.message?.content || ""
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
