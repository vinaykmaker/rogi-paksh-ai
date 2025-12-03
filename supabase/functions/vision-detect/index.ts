/**
 * Production-optimized vision detection edge function
 * Alternative endpoint with enhanced multilingual support
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60000;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Comprehensive system prompt
const systemPrompt = `You are AgriBot Vision AI, a specialized agricultural plant pathologist for Indian farmers.

## MISSION
Analyze crop images to detect diseases, pests, and nutritional deficiencies. Provide actionable guidance in multiple languages.

## CROP EXPERTISE
CEREALS: Rice, Wheat, Maize, Bajra, Jowar, Ragi
PULSES: Chickpea, Pigeon Pea, Lentils, Black Gram, Green Gram
VEGETABLES: Tomato, Potato, Onion, Brinjal, Chilli, Okra, Cauliflower, Cabbage, Cucumber
FRUITS: Mango, Banana, Papaya, Guava, Citrus, Pomegranate, Grapes
OILSEEDS: Groundnut, Mustard, Soybean, Sunflower
CASH CROPS: Cotton, Sugarcane, Tobacco, Jute
SPICES: Turmeric, Ginger, Coriander

## KEY DISEASES TO IDENTIFY
- Rice: Blast, Brown Spot, Sheath Blight, Bacterial Leaf Blight
- Wheat: Rust, Powdery Mildew, Loose Smut
- Tomato: Early Blight, Late Blight, Leaf Curl Virus, Bacterial Wilt
- Cotton: Bacterial Blight, Grey Mildew, Root Rot
- Mango: Anthracnose, Powdery Mildew
- Banana: Panama Wilt, Sigatoka, Bunchy Top
- Chilli: Anthracnose, Leaf Curl, Bacterial Wilt

## RESPONSE FORMAT (JSON ONLY):
{
  "detected": true,
  "crop": "Crop name",
  "disease": {
    "name": "Disease name in English",
    "nameHi": "हिंदी में नाम",
    "nameKn": "ಕನ್ನಡದಲ್ಲಿ ಹೆಸರು"
  },
  "severity": "mild|moderate|severe",
  "confidence": 50-99,
  "symptoms": {
    "en": "Detailed symptoms observed (2-3 sentences)",
    "hi": "लक्षण का विवरण हिंदी में (2-3 वाक्य)",
    "kn": "ಲಕ್ಷಣಗಳ ವಿವರಣೆ ಕನ್ನಡದಲ್ಲಿ (2-3 ವಾಕ್ಯಗಳು)"
  },
  "treatment": {
    "en": "Step-by-step treatment with specific chemicals/doses",
    "hi": "चरणबद्ध उपचार विशिष्ट दवाओं/खुराक के साथ",
    "kn": "ಹಂತ-ಹಂತವಾಗಿ ಚಿಕಿತ್ಸೆ ನಿರ್ದಿಷ್ಟ ಔಷಧಗಳು/ಡೋಸ್ ಜೊತೆಗೆ"
  },
  "prevention": {
    "en": "3-4 prevention tips",
    "hi": "3-4 रोकथाम के उपाय",
    "kn": "3-4 ತಡೆಗಟ್ಟುವ ಸಲಹೆಗಳು"
  },
  "organic_remedy": {
    "en": "Natural/organic treatment option with measurements",
    "hi": "प्राकृतिक/जैविक उपचार माप के साथ",
    "kn": "ನೈಸರ್ಗಿಕ/ಸಾವಯವ ಚಿಕಿತ್ಸೆ ಅಳತೆಯೊಂದಿಗೆ"
  }
}

## RULES:
1. If NOT a plant image: {"detected": false, "message": {"en": "Please upload a plant image", "hi": "...", "kn": "..."}}
2. If HEALTHY: Return with disease.name = "Healthy Plant", severity = "none"
3. Confidence 50-70% if unsure, recommend expert
4. Provide EXACT dosages (e.g., "2ml per liter")
5. Include organic AND chemical options
6. Keep language simple for farmers

OUTPUT ONLY THE JSON. NO MARKDOWN.`;

async function callVisionAI(imageBase64: string, apiKey: string): Promise<Response> {
  const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Analyze this crop image. Identify the plant, detect any disease/pest/deficiency, and provide complete diagnosis with treatment in English, Hindi, and Kannada."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseAIResponse(aiResponse: string): Record<string, unknown> {
  let cleaned = aiResponse
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  
  const result = JSON.parse(cleaned);
  
  // Validate and normalize
  if (typeof result.detected !== 'boolean') result.detected = true;
  if (result.detected && !result.confidence) result.confidence = 70;
  if (result.confidence) result.confidence = Math.min(99, Math.max(0, parseInt(result.confidence)));
  
  return result;
}

function createErrorResponse(errorType: string, lang: string = "en"): Record<string, unknown> {
  const messages: Record<string, Record<string, string>> = {
    parse_error: {
      en: "Unable to analyze image. Please try with a clearer, well-lit photo of the affected plant.",
      hi: "छवि का विश्लेषण करने में असमर्थ। कृपया प्रभावित पौधे की स्पष्ट, अच्छी रोशनी वाली तस्वीर के साथ प्रयास करें।",
      kn: "ಚಿತ್ರವನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಪ್ರಭಾವಿತ ಸಸ್ಯದ ಸ್ಪಷ್ಟ, ಉತ್ತಮ ಬೆಳಕಿನ ಚಿತ್ರದೊಂದಿಗೆ ಪ್ರಯತ್ನಿಸಿ."
    },
    timeout: {
      en: "Request timed out. Please try with a smaller image.",
      hi: "अनुरोध का समय समाप्त हो गया। कृपया छोटी छवि के साथ प्रयास करें।",
      kn: "ವಿನಂತಿ ಸಮಯ ಮೀರಿದೆ. ದಯವಿಟ್ಟು ಸಣ್ಣ ಚಿತ್ರದೊಂದಿಗೆ ಪ್ರಯತ್ನಿಸಿ."
    },
    generic: {
      en: "Detection failed. Please try again.",
      hi: "पहचान विफल। कृपया पुनः प्रयास करें।",
      kn: "ಪತ್ತೆ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
    }
  };

  const msg = messages[errorType] || messages.generic;

  return {
    detected: false,
    error: msg[lang] || msg.en,
    message: msg,
    tips: {
      en: ["Take photo in natural daylight", "Focus on the affected area", "Hold camera steady"],
      hi: ["प्राकृतिक दिन के उजाले में फोटो लें", "प्रभावित क्षेत्र पर ध्यान दें", "कैमरा स्थिर रखें"],
      kn: ["ನೈಸರ್ಗಿಕ ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಫೋಟೋ ತೆಗೆಯಿರಿ", "ಪ್ರಭಾವಿತ ಪ್ರದೇಶದ ಮೇಲೆ ಕೇಂದ್ರೀಕರಿಸಿ", "ಕ್ಯಾಮೆರಾ ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ"]
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  
  if (!checkRateLimit(clientIP)) {
    console.warn(`[${requestId}] Rate limited: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait and try again.", detected: false }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64;
    const language = body?.language || "en";
    
    // Validate input
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "Image is required", detected: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (imageBase64.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Image too large (max 5MB)", detected: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate base64 format
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    if (cleanBase64.length < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid image data", detected: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    console.log(`[${requestId}] Processing (${Math.round(imageBase64.length / 1024)}KB)`);

    // Call AI with retries
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[${requestId}] Retry ${attempt}`);
          await delay(RETRY_DELAY_MS * attempt);
        }

        response = await callVisionAI(imageBase64, LOVABLE_API_KEY);

        if (response.ok) {
          console.log(`[${requestId}] AI response OK`);
          break;
        }

        if (response.status === 429) {
          if (attempt === MAX_RETRIES) {
            return new Response(
              JSON.stringify({ error: "AI service busy. Try again later.", detected: false }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          continue;
        }

        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI service unavailable", detected: false }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        lastError = new Error(`AI error: ${response.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.name === 'AbortError') {
          lastError = new Error("timeout");
        }
      }
    }

    if (!response || !response.ok) {
      const errorType = lastError?.message === "timeout" ? "timeout" : "generic";
      return new Response(
        JSON.stringify(createErrorResponse(errorType, language)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return new Response(
        JSON.stringify(createErrorResponse("generic", language)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse response
    let result: Record<string, unknown>;
    try {
      result = parseAIResponse(aiResponse);
      const disease = result.disease as Record<string, string> | undefined;
      console.log(`[${requestId}] Result: ${result.crop || 'Unknown'} - ${disease?.name || 'N/A'}`);
    } catch (parseError) {
      console.error(`[${requestId}] Parse error:`, parseError);
      console.error(`[${requestId}] Raw:`, aiResponse.substring(0, 300));
      result = createErrorResponse("parse_error", language);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify(createErrorResponse("generic")),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
