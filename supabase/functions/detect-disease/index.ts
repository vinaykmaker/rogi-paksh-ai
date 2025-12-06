/**
 * Production-optimized crop disease detection edge function
 * Features: Robust error handling, retry logic, quality validation, accurate AI prompting
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 15; // requests per window
const RATE_WINDOW_MS = 60000; // 1 minute
const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // 6MB base64
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 45000;

// Confidence thresholds for accurate reporting
const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50,
};

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIP);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Production-optimized system prompt with MULTI-STAGE VERIFICATION for maximum accuracy
const SYSTEM_PROMPT = `You are AgriBot AI, an expert agricultural plant pathologist with 20+ years of experience in Indian crop diseases.

CRITICAL MISSION: Provide HIGHLY ACCURATE disease detection with MULTI-STAGE VERIFICATION to protect farmers' crops.

## MANDATORY MULTI-STAGE VERIFICATION PROCESS
STAGE 1 - CROP IDENTIFICATION:
- Identify crop from leaf shape, venation, stem structure
- Note plant growth stage and overall health
- Assess image quality and lighting

STAGE 2 - SYMPTOM MAPPING:
- Document ALL visible symptoms systematically
- Categorize: spots, lesions, discoloration, wilting, deformities, holes
- Estimate affected area percentage

STAGE 3 - DIFFERENTIAL DIAGNOSIS:
- List top 3 possible conditions matching symptoms
- Compare each against ALL observed symptoms
- Rule out conditions that don't match

STAGE 4 - CONFIDENCE SCORING:
- 85-99%: ALL symptoms match perfectly, high image quality
- 70-84%: Most symptoms match, some ambiguity
- 50-69%: Partial match, MUST recommend expert consultation
- Below 50%: Request better image or expert help

STAGE 5 - VERIFICATION CHECK:
- Does recommended treatment match this specific disease?
- Are there contradicting symptoms?
- Is this diagnosis safe to act upon?

## YOUR EXPERTISE
Indian crops: Rice, Wheat, Maize, Ragi | Tomato, Potato, Onion, Brinjal, Chilli, Okra | Mango, Banana, Papaya, Citrus | Cotton, Sugarcane | Groundnut, Mustard

## COMMON DISEASES (Know these well):
- Rice: Blast, Brown Spot, Sheath Blight, Bacterial Leaf Blight, Tungro
- Wheat: Rust (Yellow/Brown/Black), Powdery Mildew, Loose Smut
- Tomato: Early Blight, Late Blight, Leaf Curl Virus, Bacterial Wilt
- Potato: Late Blight, Early Blight, Black Scurf
- Cotton: Bacterial Blight, Grey Mildew, Alternaria Leaf Spot
- Mango: Anthracnose, Powdery Mildew, Bacterial Canker
- Banana: Panama Wilt, Sigatoka, Bunchy Top
- Chilli: Anthracnose, Leaf Curl, Bacterial Wilt

## PESTS: Aphids, Whiteflies, Thrips, Jassids, Borers, Mites, Mealybugs

## NUTRIENT DEFICIENCY:
- Nitrogen: Uniform yellowing from older leaves
- Phosphorus: Purple/reddish discoloration
- Potassium: Leaf margin scorching
- Iron: Interveinal chlorosis in young leaves

## OUTPUT FORMAT (STRICT JSON):
{
  "crop": "Exact crop name",
  "issue": "Specific disease/pest/deficiency name",
  "category": "disease|pest|deficiency|healthy|environmental|invalid",
  "severity": "Low|Medium|High",
  "confidence": "50-99",
  "verification_notes": "Brief explanation of how diagnosis was verified",
  "alternative_diagnosis": "Second most likely condition if confidence < 85%",
  "description": {
    "english": "3-4 sentences: What symptoms observed. What farmer can check to confirm. Confidence explanation.",
    "hindi": "3-4 वाक्य: लक्षण क्या दिखे। किसान कैसे जांच सकता है।",
    "kannada": "3-4 ವಾಕ್ಯಗಳು: ಯಾವ ಲಕ್ಷಣಗಳು ಕಂಡವು. ರೈತ ಹೇಗೆ ಖಚಿತಪಡಿಸಬಹುದು."
  },
  "solutions": {
    "english": "✅ DO NOW: [Immediate action]. ✅ ORGANIC: [Exact recipe - 5ml neem oil + 1ml soap per 1L water]. ✅ CHEMICAL: [Product, dosage, timing]. ⚠️ AVOID: [What NOT to do].",
    "hindi": "✅ अभी करें: [तुरंत कार्य]। ✅ जैविक: [सटीक नुस्खा]। ✅ रासायनिक: [दवा, मात्रा]। ⚠️ न करें: [क्या बचें]।",
    "kannada": "✅ ಈಗ ಮಾಡಿ: [ತಕ್ಷಣ]. ✅ ಸಾವಯವ: [ನಿಖರ ಪಾಕವಿಧಾನ]. ✅ ರಾಸಾಯನಿಕ: [ಔಷಧಿ, ಪ್ರಮಾಣ]. ⚠️ ಮಾಡಬೇಡಿ: [ಏನು ತಪ್ಪಿಸಬೇಕು]."
  },
  "prevention": {
    "english": "🛡️ PREVENT RECURRENCE: 1) [Step 1 with timing]. 2) [Step 2]. 3) [Long-term strategy].",
    "hindi": "🛡️ दोबारा रोकें: 1) [कदम 1]। 2) [कदम 2]। 3) [दीर्घकालिक]।",
    "kannada": "🛡️ ಮರುಕಳಿಸುವಿಕೆ ತಡೆಯಿರಿ: 1) [ಹಂತ 1]. 2) [ಹಂತ 2]. 3) [ದೀರ್ಘಕಾಲೀನ]."
  },
  "tts": {
    "english": "Your [crop] has [issue]. Do this now: [action]. Avoid [mistake].",
    "hindi": "आपके [फसल] में [समस्या] है। अभी करें: [कार्य]। बचें: [गलती]।",
    "kannada": "ನಿಮ್ಮ [ಬೆಳೆ] ಗೆ [ಸಮಸ್ಯೆ] ಇದೆ. ಈಗ ಮಾಡಿ: [ಕ್ರಿಯೆ]. ತಪ್ಪಿಸಿ: [ತಪ್ಪು]."
  },
  "action_urgency": "immediate|within_3_days|within_week|routine",
  "expert_consultation": true|false,
  "confidence_reason": "Why this confidence level",
  "timestamp": "ISO timestamp"
}

## CRITICAL ACCURACY RULES:
1. NEVER guess - if unclear, confidence < 60% and recommend expert
2. If symptoms match multiple diseases, provide alternative_diagnosis
3. VERIFY treatment matches disease before responding
4. If confidence < 70%, MUST set expert_consultation: true
5. If HEALTHY plant, confidence 90%+ with preventive tips
6. If NOT a plant image, category: "invalid"
7. Use EXACT measurements (ml, grams, liters) - no vague terms
8. TTS max 2 SHORT sentences
9. ALWAYS include what to AVOID

## SEVERITY RULES:
- Low: <20% affected, early stage (need 70%+ confidence)
- Medium: 20-50% affected (need 75%+ confidence)
- High: >50% affected (need 80%+ confidence OR recommend expert)

RESPOND ONLY WITH THE JSON OBJECT. NO MARKDOWN CODE BLOCKS.`;

async function callVisionAI(imageData: string, apiKey: string, timeoutMs: number): Promise<Response> {
  const imageUrl = imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
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
          { role: "system", content: SYSTEM_PROMPT },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Analyze this crop/plant image carefully. Identify the crop, detect any diseases, pests, or deficiencies, assess severity, and provide complete diagnosis with treatment options in English, Hindi, and Kannada."
              },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        temperature: 0.2, // Low temperature for consistent, accurate results
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

function parseAndValidateResponse(aiResponse: string, timestamp: string): Record<string, unknown> {
  // Clean markdown formatting
  let cleaned = aiResponse
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();
  
  // Extract JSON object if wrapped in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  const parsed = JSON.parse(cleaned);
  
  // Validate and normalize required fields
  if (!parsed.crop) parsed.crop = "Unknown Crop";
  if (!parsed.issue) parsed.issue = "Unable to Determine";
  if (!parsed.category) parsed.category = "disease";
  if (!parsed.severity) parsed.severity = "Medium";
  
  // Validate confidence
  let confidence = parseInt(parsed.confidence);
  if (isNaN(confidence) || confidence < 0) confidence = 50;
  if (confidence > 99) confidence = 99;
  parsed.confidence = String(confidence);
  
  // Ensure description object exists
  if (!parsed.description || typeof parsed.description !== 'object') {
    parsed.description = {
      english: "Analysis complete. See treatment recommendations below.",
      hindi: "विश्लेषण पूर्ण। नीचे उपचार देखें।",
      kannada: "ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣ. ಕೆಳಗೆ ಚಿಕಿತ್ಸೆ ನೋಡಿ."
    };
  }
  
  // Ensure solutions object exists
  if (!parsed.solutions || typeof parsed.solutions !== 'object') {
    parsed.solutions = {
      english: "Consult a local agricultural officer for specific treatment recommendations.",
      hindi: "विशिष्ट उपचार के लिए स्थानीय कृषि अधिकारी से संपर्क करें।",
      kannada: "ನಿರ್ದಿಷ್ಟ ಚಿಕಿತ್ಸೆಗಾಗಿ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
    };
  }
  
  // Ensure TTS object exists
  if (!parsed.tts || typeof parsed.tts !== 'object') {
    parsed.tts = {
      english: `Your ${parsed.crop} has ${parsed.issue}. Please check treatment recommendations.`,
      hindi: `आपके ${parsed.crop} में ${parsed.issue} है। कृपया उपचार देखें।`,
      kannada: `ನಿಮ್ಮ ${parsed.crop} ಗೆ ${parsed.issue} ಇದೆ. ದಯವಿಟ್ಟು ಚಿಕಿತ್ಸೆ ನೋಡಿ.`
    };
  }
  
  // Add timestamp and defaults
  parsed.timestamp = timestamp;
  if (!parsed.preventive_tips) parsed.preventive_tips = "Practice crop rotation, maintain field hygiene, and use disease-resistant varieties.";
  if (!parsed.action_urgency) parsed.action_urgency = "within_week";
  if (typeof parsed.expert_consultation !== 'boolean') parsed.expert_consultation = confidence < CONFIDENCE_THRESHOLDS.MEDIUM;
  
  return parsed;
}

function createFallbackResponse(reason: string, timestamp: string): Record<string, unknown> {
  return {
    crop: "Unknown",
    issue: "Detection Incomplete",
    category: "unknown",
    severity: "Unknown",
    confidence: "0",
    description: {
      english: `Unable to complete analysis: ${reason}. Please try again with a clearer image of the affected plant part.`,
      hindi: `विश्लेषण पूरा नहीं हो सका: ${reason}। कृपया प्रभावित पौधे के भाग की स्पष्ट तस्वीर के साथ पुनः प्रयास करें।`,
      kannada: `ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ: ${reason}. ದಯವಿಟ್ಟು ಪ್ರಭಾವಿತ ಸಸ್ಯದ ಭಾಗದ ಸ್ಪಷ್ಟ ಚಿತ್ರದೊಂದಿಗೆ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.`
    },
    solutions: {
      english: "📷 Tips for better results: 1) Use natural daylight 2) Focus on affected area 3) Include both healthy and affected parts",
      hindi: "📷 बेहतर परिणाम के लिए: 1) प्राकृतिक रोशनी में 2) प्रभावित क्षेत्र पर फोकस 3) स्वस्थ और प्रभावित दोनों भाग शामिल करें",
      kannada: "📷 ಉತ್ತಮ ಫಲಿತಾಂಶಕ್ಕಾಗಿ: 1) ನೈಸರ್ಗಿಕ ಬೆಳಕಿನಲ್ಲಿ 2) ಪ್ರಭಾವಿತ ಪ್ರದೇಶದ ಮೇಲೆ ಕೇಂದ್ರೀಕರಿಸಿ 3) ಆರೋಗ್ಯಕರ ಮತ್ತು ಪ್ರಭಾವಿತ ಭಾಗಗಳನ್ನು ಸೇರಿಸಿ"
    },
    tts: {
      english: "Could not detect disease. Please try with a clearer photo.",
      hindi: "रोग का पता नहीं चला। कृपया स्पष्ट फोटो के साथ प्रयास करें।",
      kannada: "ರೋಗ ಪತ್ತೆಯಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟ ಫೋಟೋದೊಂದಿಗೆ ಪ್ರಯತ್ನಿಸಿ."
    },
    preventive_tips: "Ensure good image quality for accurate detection.",
    action_urgency: "routine",
    expert_consultation: true,
    timestamp
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIP)) {
    console.warn(`[${requestId}] Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ 
        error: "Too many requests. Please wait a moment and try again.",
        errorCode: "RATE_LIMITED",
        retryAfter: 60
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  try {
    const body = await req.json();
    const imageData = body?.imageData;
    
    // Input validation
    if (!imageData || typeof imageData !== "string") {
      console.warn(`[${requestId}] Invalid input: missing or invalid imageData`);
      return new Response(
        JSON.stringify({ 
          error: "Image data is required and must be a string",
          errorCode: "INVALID_INPUT"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Size validation
    if (imageData.length > MAX_IMAGE_SIZE) {
      console.warn(`[${requestId}] Image too large: ${Math.round(imageData.length / 1024)}KB`);
      return new Response(
        JSON.stringify({ 
          error: "Image is too large. Please compress or resize to under 5MB.",
          errorCode: "IMAGE_TOO_LARGE",
          maxSizeMB: 5
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Minimum size validation
    if (imageData.length < 5000) {
      console.warn(`[${requestId}] Image too small: ${imageData.length} bytes`);
      return new Response(
        JSON.stringify({ 
          error: "Image appears to be corrupt or too small.",
          errorCode: "INVALID_IMAGE"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      throw new Error("AI service not configured");
    }

    console.log(`[${requestId}] Processing image (${Math.round(imageData.length / 1024)}KB)`);

    // Retry logic for resilience
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[${requestId}] Retry ${attempt}/${MAX_RETRIES}`);
          await delay(RETRY_DELAY_MS * attempt);
        }

        response = await callVisionAI(imageData, LOVABLE_API_KEY, REQUEST_TIMEOUT_MS);

        if (response.ok) {
          console.log(`[${requestId}] AI response received (attempt ${attempt + 1})`);
          break;
        }

        // Handle specific HTTP errors
        if (response.status === 429) {
          console.warn(`[${requestId}] AI rate limit hit`);
          if (attempt === MAX_RETRIES) {
            return new Response(
              JSON.stringify({ 
                error: "AI service is busy. Please try again in a few minutes.",
                errorCode: "AI_RATE_LIMITED"
              }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          continue;
        }

        if (response.status === 402) {
          console.error(`[${requestId}] AI credits exhausted`);
          return new Response(
            JSON.stringify({ 
              error: "AI service temporarily unavailable. Please try again later.",
              errorCode: "SERVICE_UNAVAILABLE"
            }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const errorText = await response.text();
        console.error(`[${requestId}] AI error (${response.status}): ${errorText.slice(0, 200)}`);
        lastError = new Error(`AI gateway error: ${response.status}`);

      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error(`[${requestId}] Request timeout`);
          lastError = new Error("Request timed out");
        } else {
          console.error(`[${requestId}] Fetch error:`, fetchError);
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        }
      }
    }

    if (!response || !response.ok) {
      console.error(`[${requestId}] All retries failed`);
      return new Response(
        JSON.stringify(createFallbackResponse(lastError?.message || "Network error", timestamp)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error(`[${requestId}] Empty AI response`);
      return new Response(
        JSON.stringify(createFallbackResponse("Empty response from AI", timestamp)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate response
    let result;
    try {
      result = parseAndValidateResponse(aiResponse, timestamp);
      console.log(`[${requestId}] Detection: ${result.crop} - ${result.issue} (${result.confidence}%)`);
    } catch (parseError) {
      console.error(`[${requestId}] Parse error:`, parseError);
      console.error(`[${requestId}] Raw response:`, aiResponse.substring(0, 500));
      result = createFallbackResponse("Could not parse AI response", timestamp);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${requestId}] Fatal error:`, errorMessage);
    
    return new Response(
      JSON.stringify({
        error: "Detection failed. Please try again.",
        errorCode: "INTERNAL_ERROR",
        ...createFallbackResponse(errorMessage, timestamp)
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
