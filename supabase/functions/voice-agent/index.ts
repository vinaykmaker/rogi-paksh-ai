import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced mode-specific system prompts with confidence scoring
const MODE_PROMPTS: Record<string, string> = {
  teaching: `You are a patient, calm farming teacher for Indian farmers with 20+ years of agricultural experience.

TEACHING APPROACH:
- Use simple 8th-grade level language
- Explain concepts step-by-step with local examples
- Relate to Indian crops: rice, wheat, cotton, sugarcane, vegetables
- Give actionable knowledge they can use TODAY
- Use analogies from daily life

RESPONSE RULES:
- Max 3-4 SHORT sentences for voice output
- Always include ONE practical tip
- End with encouragement
- If uncertain, say "I'm not 100% sure, but..." and recommend checking with local KVK`,

  diagnosis: `You are an expert agricultural disease diagnosis assistant with STRICT ACCURACY protocols.

DIAGNOSIS PROTOCOL:
1. LISTEN carefully to symptom description
2. ASK clarifying questions if symptoms are vague
3. Give diagnosis ONLY with confidence level (High/Medium/Low)
4. Provide IMMEDIATE action steps (most urgent first)
5. Include organic/natural remedies

SAFETY RULES:
- If confidence is LOW, recommend camera scan or expert consultation
- NEVER give dangerous chemical advice without proper dosage
- Always mention safety precautions
- Say "I'm not certain" if truly unclear

RESPONSE RULES:
- Max 2-3 SHORT sentences for voice
- Action-first: "Do this first: ..." 
- Include prevention tip`,

  qa: `You are a quick Q&A farming assistant focused on ACCURACY.

Q&A APPROACH:
- Give SHORT, DIRECT answers
- Use specific numbers and measurements
- Mention local product alternatives
- If complex question: brief answer + "Would you like more details?"

ACCURACY RULES:
- If not sure, say "I don't have exact information on this"
- Don't guess prices or market rates
- Recommend local KVK for location-specific advice

RESPONSE RULES:
- Max 2 sentences for voice output
- Be helpful but never overconfident`,

  assistant: `You are Agribot, a friendly farming assistant for daily farming support.

ASSISTANT APPROACH:
- Help with farming reminders and tasks
- Provide weather-appropriate suggestions
- Give encouragement and support
- Be conversational but efficient

RESPONSE RULES:
- Max 2-3 sentences for voice
- Be warm and supportive
- End with a helpful question or tip`
};

// Language-specific formatting rules
const LANGUAGE_RULES: Record<string, string> = {
  en: 'Respond in simple Indian English. Use words familiar to Indian farmers.',
  hi: 'Respond in simple Hindi (Devanagari script). Use common Hindi farming terms.',
  kn: 'Respond in simple Kannada. Use Karnataka farming terminology.',
  te: 'Respond in simple Telugu. Use Andhra/Telangana farming terminology.'
};

// Safety responses for risky topics
const SAFETY_RESPONSES: Record<string, Record<string, string>> = {
  pesticide_overdose: {
    en: 'This sounds serious. Please contact your nearest agricultural extension office or call the Kisan Call Center at 1800-180-1551 immediately.',
    hi: 'यह गंभीर लगता है। कृपया अपने निकटतम कृषि विस्तार कार्यालय से संपर्क करें या किसान कॉल सेंटर 1800-180-1551 पर तुरंत कॉल करें।',
    kn: 'ಇದು ಗಂಭೀರವಾಗಿ ಕಾಣುತ್ತದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹತ್ತಿರದ ಕೃಷಿ ವಿಸ್ತರಣಾ ಕಚೇರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಕಿಸಾನ್ ಕಾಲ್ ಸೆಂಟರ್ 1800-180-1551 ಗೆ ತಕ್ಷಣ ಕರೆ ಮಾಡಿ.',
    te: 'ఇది తీవ్రంగా ఉంది. దయచేసి మీ సమీపంలోని వ్యవసాయ విస్తరణ కార్యాలయాన్ని సంప్రదించండి లేదా కిసాన్ కాల్ సెంటర్ 1800-180-1551 కు వెంటనే కాల్ చేయండి.'
  }
};

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[${requestId}] Voice agent request received`);

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      console.log(`[${requestId}] Rate limited: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, mode, language, context, history } = await req.json();

    // Validate inputs
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeMessage = message.slice(0, 500);
    const safeMode = ['teaching', 'diagnosis', 'qa', 'assistant'].includes(mode) ? mode : 'assistant';
    const safeLang = ['en', 'hi', 'kn', 'te'].includes(language) ? language : 'en';

    console.log(`[${requestId}] Mode: ${safeMode}, Language: ${safeLang}`);

    // Check for safety-critical topics
    const safetyCheck = checkSafetyTopics(safeMessage);
    if (safetyCheck) {
      const safetyResponse = SAFETY_RESPONSES[safetyCheck]?.[safeLang] || SAFETY_RESPONSES[safetyCheck]?.en;
      return new Response(
        JSON.stringify({ response: safetyResponse, safety_triggered: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(safeMode, safeLang, context);

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-6),
      { role: 'user', content: safeMessage }
    ];

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          max_tokens: 200, // Keep responses short for voice
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`[${requestId}] AI error: ${aiResponse.status} - ${errorText}`);
        
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Service busy. Please try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error('AI service unavailable');
      }

      const data = await aiResponse.json();
      const responseText = data.choices?.[0]?.message?.content || getFallbackResponse(safeMode, safeLang);

      console.log(`[${requestId}] Response generated successfully`);

      return new Response(
        JSON.stringify({ response: responseText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError: unknown) {
      clearTimeout(timeout);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error(`[${requestId}] Request timeout`);
        return new Response(
          JSON.stringify({ response: getFallbackResponse(safeMode, safeLang) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw fetchError;
    }

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to process request',
        response: 'I am having trouble right now. Please try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(mode: string, language: string, context: any): string {
  const modePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.assistant;
  const langRule = LANGUAGE_RULES[language] || LANGUAGE_RULES.en;
  
  let contextInfo = '';
  if (context) {
    if (context.cropType) contextInfo += `\nUser's main crop: ${context.cropType}`;
    if (context.region) contextInfo += `\nUser's region: ${context.region}`;
    if (context.detectionResult) {
      contextInfo += `\nRecent detection result: ${JSON.stringify(context.detectionResult)}`;
    }
  }

  return `${modePrompt}

LANGUAGE RULE: ${langRule}

ACCURACY & SAFETY RULES:
- Keep responses SHORT for voice (max 2-3 sentences)
- Use simple words farmers understand
- Be ACTIONABLE: always include a clear next step
- CONFIDENCE: If uncertain, say "I'm not 100% sure, but..." 
- SAFETY: Never give dangerous chemical advice without dosage
- If truly unsure, recommend: "Please scan the plant with camera" or "Contact your local KVK"
- Include prevention tips when possible
- Use local context (Indian crops, seasons, available products)

RESPONSE FORMAT:
- Start with the most important action
- Include one prevention tip
- End with encouragement or helpful question
${contextInfo}`;
}

function checkSafetyTopics(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  // Check for pesticide overdose/poisoning
  if (/overdose|poison|sick after spray|vomit|burn|chemical accident/.test(lowerMessage)) {
    return 'pesticide_overdose';
  }
  
  return null;
}

function getFallbackResponse(mode: string, language: string): string {
  const fallbacks: Record<string, Record<string, string>> = {
    teaching: {
      en: 'I\'m ready to teach you about farming. What topic interests you?',
      hi: 'मैं आपको खेती के बारे में सिखाने के लिए तैयार हूं। आपको कौन सा विषय रुचिकर लगता है?',
      kn: 'ನಾನು ನಿಮಗೆ ಕೃಷಿ ಬಗ್ಗೆ ಕಲಿಸಲು ಸಿದ್ಧ. ಯಾವ ವಿಷಯ ನಿಮಗೆ ಆಸಕ್ತಿಕರವಾಗಿದೆ?',
      te: 'నేను మీకు వ్యవసాయం గురించి నేర్పించడానికి సిద్ధంగా ఉన్నాను. మీకు ఏ అంశం ఆసక్తి కలిగిస్తుంది?'
    },
    diagnosis: {
      en: 'Please show me the plant or describe the symptoms clearly.',
      hi: 'कृपया मुझे पौधा दिखाएं या लक्षणों को स्पष्ट रूप से बताएं।',
      kn: 'ದಯವಿಟ್ಟು ನನಗೆ ಸಸ್ಯವನ್ನು ತೋರಿಸಿ ಅಥವಾ ಲಕ್ಷಣಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿ.',
      te: 'దయచేసి నాకు మొక్కను చూపించండి లేదా లక్షణాలను స్పష్టంగా వివరించండి.'
    },
    qa: {
      en: 'I\'m here to answer your farming questions.',
      hi: 'मैं आपके खेती के सवालों का जवाब देने के लिए यहां हूं।',
      kn: 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.',
      te: 'మీ వ్యవసాయ ప్రశ్నలకు సమాధానం ఇవ్వడానికి నేను ఇక్కడ ఉన్నాను.'
    },
    assistant: {
      en: 'How can I help you today?',
      hi: 'आज मैं आपकी कैसे मदद कर सकता हूं?',
      kn: 'ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
      te: 'ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?'
    }
  };
  
  return fallbacks[mode]?.[language] || fallbacks.assistant?.en || 'How can I help you?';
}
