import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;
const MAX_INPUT_LENGTH = 500;
const REQUEST_TIMEOUT_MS = 45000;

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
    const { 
      topic, 
      cropType, 
      season, 
      region,
      diseaseHistory,
      language = "en", 
      skillLevel = "beginner",
      lessonType = "micro" // micro, detailed, step-by-step
    } = body;
    
    // Input validation
    for (const [key, val] of Object.entries({ topic, cropType, season, region })) {
      if (val && (typeof val !== "string" || val.length > MAX_INPUT_LENGTH)) {
        return new Response(
          JSON.stringify({ error: `${key} must be a string with max ${MAX_INPUT_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Enhanced system prompt for comprehensive AI education
    const systemPrompt = `You are AGRIBOT - India's most trusted AI agricultural educator. Create COMPREHENSIVE, ACCURATE lessons personalized for Indian farmers.

TARGET AUDIENCE:
- Indian farmers from ${region || 'all regions'} (Karnataka, Maharashtra, Tamil Nadu, Andhra Pradesh, Telangana, Punjab, UP, etc.)
- Skill level: ${skillLevel}
- Primary crops: ${cropType || 'Rice, Wheat, Ragi, Sugarcane, Cotton, Vegetables, Mango, Coconut'}
- Current season context: ${season || 'Year-round applicable'}
${diseaseHistory ? `- Recent disease history: ${diseaseHistory}` : ''}

LESSON TYPE: ${lessonType}

CRITICAL REQUIREMENTS:
1. ACCURACY: Every fact must be scientifically accurate. Cite sources when possible.
2. ACTIONABLE: Every point must have a CLEAR ACTION farmer can take TODAY.
3. LOCALIZED: Use local names, available products, Indian measurements (hectares, kg, INR).
4. SIMPLE LANGUAGE: 8th-grade reading level. Avoid complex scientific terms.
5. SAFE: Never give advice that could harm crops, animals, or humans. Include warnings.
6. SEASONAL: Consider current season and timing for all recommendations.
7. COST-EFFECTIVE: Prioritize affordable, locally available solutions.

CONTENT STRUCTURE (strict JSON):
{
  "title": { "en": "...", "hi": "...", "kn": "...", "te": "..." },
  "duration": "5-7 mins",
  "difficulty": "beginner/intermediate/advanced",
  "icon": "🌱",
  "category": "pest-control/soil-health/water-management/disease-prevention/harvest/organic",
  "summary": { 
    "en": "2-3 sentences. What farmer will learn. Why it matters NOW.", 
    "hi": "...", "kn": "...", "te": "..." 
  },
  "audioSummary": {
    "en": "60-second summary optimized for TTS playback. Clear, slow speech friendly.",
    "hi": "...", "kn": "...", "te": "..."
  },
  "keyPoints": [
    { "en": "ACTION: [Specific step with exact measurements] | WHEN: [Exact timing] | WHY: [Clear benefit]", "hi": "...", "kn": "...", "te": "..." },
    { "en": "ACTION: [Step 2 with dosage] | WHEN: [Best time of day/season] | WHY: [Expected result]", "hi": "...", "kn": "...", "te": "..." },
    { "en": "ACTION: [Step 3] | WHEN: [Frequency] | WHY: [Scientific reason]", "hi": "...", "kn": "...", "te": "..." },
    { "en": "PREVENTION: [How to avoid future problems with specific steps]", "hi": "...", "kn": "...", "te": "..." }
  ],
  "stepByStep": [
    {
      "step": 1,
      "action": { "en": "Clear, numbered action with exact measurement", "hi": "...", "kn": "...", "te": "..." },
      "timing": "When to do this (time of day, season, frequency)",
      "materials": ["Material 1 with quantity", "Material 2"],
      "warning": { "en": "Safety warning if applicable", "hi": "...", "kn": "...", "te": "..." }
    },
    {
      "step": 2,
      "action": { "en": "Next step...", "hi": "...", "kn": "...", "te": "..." },
      "timing": "...",
      "materials": []
    },
    {
      "step": 3,
      "action": { "en": "Final step...", "hi": "...", "kn": "...", "te": "..." },
      "timing": "..."
    }
  ],
  "practicalTip": { 
    "en": "ONE thing farmer can do TODAY with materials at home. Be SPECIFIC.", 
    "hi": "...", "kn": "...", "te": "..." 
  },
  "didYouKnow": { 
    "en": "Surprising, motivating fact that encourages action. Include a number or statistic.", 
    "hi": "...", "kn": "...", "te": "..." 
  },
  "doNot": { 
    "en": "Common MISTAKE to avoid and WHY it causes problems. Be specific about consequences.", 
    "hi": "...", "kn": "...", "te": "..." 
  },
  "preventionTips": [
    { "en": "Prevention tip 1 with timing", "hi": "...", "kn": "...", "te": "..." },
    { "en": "Prevention tip 2 with frequency", "hi": "...", "kn": "...", "te": "..." }
  ],
  "quiz": {
    "question": { "en": "Simple question testing ONE key concept from the lesson", "hi": "...", "kn": "...", "te": "..." },
    "options": ["Option A (make one clearly correct)", "Option B (common misconception)", "Option C (partially correct)"],
    "answer": 0,
    "explanation": { "en": "Why the correct answer is right and why others are wrong", "hi": "...", "kn": "...", "te": "..." }
  },
  "additionalQuizzes": [
    {
      "question": { "en": "Second quiz question on different concept", "hi": "...", "kn": "...", "te": "..." },
      "options": ["A", "B", "C"],
      "answer": 1,
      "explanation": { "en": "...", "hi": "...", "kn": "...", "te": "..." }
    }
  ],
  "videoTopic": "Suggested 2-minute video topic: [specific visual demonstration]",
  "governmentSchemes": [
    {
      "name": "Relevant scheme name (e.g., PM-KISAN, Crop Insurance)",
      "description": { "en": "How this scheme helps with this topic", "hi": "...", "kn": "...", "te": "..." },
      "link": "Optional link"
    }
  ],
  "relatedTopics": ["Topic 1 to learn next", "Topic 2"]
}

LANGUAGE GUIDELINES:
- Hindi: Natural Devanagari, not transliteration. Use farming terms farmers actually use.
- Kannada: Natural script with local agricultural terminology.
- Telugu: Natural Telugu script with regional farming terms.
- All: Keep sentences short. Use active voice. Be encouraging.

ACCURACY VERIFICATION:
- Include specific product names available in India (Neem oil, Jeevamrut, Trichoderma, Pseudomonas, etc.)
- Use correct dosages (e.g., "5ml neem oil per liter of water")
- Include correct timings (e.g., "spray early morning before 9am or evening after 4pm")
- Reference KVK (Krishi Vigyan Kendra) when relevant
- Mention crop insurance and government subsidies where applicable

SAFETY RULES:
- Always include safety warnings for chemicals
- Never recommend banned pesticides
- Include waiting periods before harvest
- Mention PPE requirements
- Add "consult local KVK" for complex issues`;

    // Build dynamic prompt based on inputs
    let userPrompt = `Create a comprehensive ${lessonType} lesson`;
    if (topic) userPrompt += ` about "${topic}"`;
    if (cropType) userPrompt += ` specifically for ${cropType} farming`;
    if (season) userPrompt += ` during ${season} season`;
    if (region) userPrompt += ` for farmers in ${region}`;
    if (diseaseHistory) userPrompt += `. The farmer has recently dealt with: ${diseaseHistory}`;
    if (!topic) userPrompt += `. Pick an engaging, seasonal topic: pest management, soil health, water conservation, organic methods, disease prevention, nutrient management, or harvest techniques. Make it relevant to current farming needs.`;

    console.log(`[${requestId}] Generating ${lessonType} lesson: ${userPrompt}`);

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
      
      // Add metadata
      lesson.generatedAt = new Date().toISOString();
      lesson.requestId = requestId;
      lesson.personalization = { topic, cropType, season, region, skillLevel, lessonType };
      
      console.log(`[${requestId}] Enhanced lesson generated: ${lesson.title.en}`);
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
