import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60000;
const MAX_INPUT_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 30000;

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIP)) {
    console.warn(`[${requestId}] Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { topic, cropType, season, language = "en", skillLevel = "beginner" } = body;
    
    // Input validation
    for (const [key, val] of Object.entries({ topic, cropType, season })) {
      if (val && (typeof val !== "string" || val.length > MAX_INPUT_LENGTH)) {
        return new Response(
          JSON.stringify({ error: `${key} must be a string with max ${MAX_INPUT_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Enhanced system prompt for personalized micro-lessons
    const systemPrompt = `You are an expert agricultural educator creating PERSONALIZED micro-lessons for Indian farmers.

TARGET AUDIENCE:
- Indian farmers (Karnataka, Maharashtra, Tamil Nadu, Punjab, UP, etc.)
- Skill level: ${skillLevel}
- Primary crops: Rice, Wheat, Ragi, Sugarcane, Cotton, Vegetables, Mango, Coconut
- Seasons: Kharif (June-Oct), Rabi (Oct-March), Zaid (March-June)

LESSON REQUIREMENTS:
1. Duration: 3-5 minutes reading time
2. Language: Simple, 8th-grade level
3. Focus: Practical, actionable advice
4. Include local context (Indian farming practices, available resources)
5. Currency in INR, measurements in hectares/acres/kg

RESPONSE FORMAT (strict JSON):
{
  "title": { "en": "...", "hi": "...", "kn": "..." },
  "duration": "5 mins",
  "difficulty": "beginner/intermediate/advanced",
  "icon": "🌱",
  "summary": { "en": "2-3 sentences overview", "hi": "...", "kn": "..." },
  "keyPoints": [
    { "en": "Point 1 (max 2 sentences)", "hi": "...", "kn": "..." },
    { "en": "Point 2", "hi": "...", "kn": "..." },
    { "en": "Point 3", "hi": "...", "kn": "..." }
  ],
  "practicalTip": { "en": "One actionable tip farmer can do today", "hi": "...", "kn": "..." },
  "didYouKnow": { "en": "Interesting fact to engage", "hi": "...", "kn": "..." },
  "quiz": {
    "question": { "en": "Simple question to test understanding", "hi": "...", "kn": "..." },
    "options": ["Option A", "Option B", "Option C"],
    "answer": 0
  }
}

IMPORTANT:
- Keep Hindi/Kannada translations natural, not literal
- Use farming terms farmers actually use
- Include specific product names available in India (Neem oil, Jeevamrut, etc.)
- Mention government schemes if relevant (PM-KISAN, crop insurance)
- All text must be farmer-friendly - no complex scientific terms`;

    // Build dynamic prompt based on inputs
    let userPrompt = "Create a micro-lesson";
    if (topic) userPrompt += ` about "${topic}"`;
    if (cropType) userPrompt += ` for ${cropType} farming`;
    if (season) userPrompt += ` during ${season} season`;
    if (!topic) userPrompt += `. Pick an engaging topic: pest management, soil health, water conservation, organic methods, disease prevention, or harvest techniques`;

    console.log(`[${requestId}] Generating lesson: ${userPrompt}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] AI error:`, response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) throw new Error("No response from AI");

    // Parse and validate response
    let lesson;
    try {
      const cleaned = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      lesson = JSON.parse(cleaned);
      
      // Validate required fields
      if (!lesson.title?.en || !lesson.summary?.en || !lesson.keyPoints?.length) {
        throw new Error("Missing required lesson fields");
      }
      
      lesson.generatedAt = new Date().toISOString();
      console.log(`[${requestId}] Lesson generated: ${lesson.title.en}`);
    } catch (parseError) {
      console.error(`[${requestId}] Parse error:`, parseError);
      throw new Error("Failed to parse lesson");
    }

    return new Response(
      JSON.stringify(lesson),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
