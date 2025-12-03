import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, language = "en" } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // System prompt for agricultural disease detection
    const systemPrompt = `You are an expert agricultural disease detection AI assistant for Indian farmers.
Analyze the provided plant/crop image and detect any diseases, pests, or health issues.

IMPORTANT: Respond in JSON format with these exact keys:

{
  "detected": true/false,
  "disease": {
    "name": "Disease name",
    "nameHi": "Hindi name",
    "nameKn": "Kannada name"
  },
  "severity": "mild/moderate/severe",
  "confidence": 85,
  "crop": "Crop type detected",
  "symptoms": {
    "en": "Visible symptoms in English",
    "hi": "Hindi symptoms",
    "kn": "Kannada symptoms"
  },
  "treatment": {
    "en": "Step-by-step treatment in simple English",
    "hi": "Hindi treatment steps",
    "kn": "Kannada treatment steps"
  },
  "prevention": {
    "en": "Prevention tips in English",
    "hi": "Hindi prevention tips",
    "kn": "Kannada prevention tips"
  },
  "organic_remedy": {
    "en": "Low-cost organic remedy",
    "hi": "Hindi organic remedy",
    "kn": "Kannada organic remedy"
  }
}

Rules:
1. If the image doesn't show a plant or crop, set detected to false
2. Give practical, low-cost solutions suitable for Indian farmers
3. Include both chemical and organic treatment options
4. Keep language simple - farmers should understand easily
5. Be specific about dosages and application methods
6. If unsure, say so and recommend consulting an expert`;

    console.log("Calling Vision AI for disease detection...");

    // Use Gemini 2.5 Flash for vision analysis
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
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Analyze this crop/plant image for diseases. Provide diagnosis in English, Hindi, and Kannada."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("Vision AI response received");

    // Parse the JSON response
    let result;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a structured error response
      result = {
        detected: false,
        error: "Could not analyze image properly",
        message: {
          en: "Unable to detect disease. Please try with a clearer image of the affected plant part.",
          hi: "रोग का पता नहीं चला। कृपया प्रभावित पौधे के भाग की स्पष्ट छवि के साथ पुनः प्रयास करें।",
          kn: "ರೋಗ ಪತ್ತೆಯಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪ್ರಭಾವಿತ ಸಸ್ಯದ ಭಾಗದ ಸ್ಪಷ್ಟ ಚಿತ್ರದೊಂದಿಗೆ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        }
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in vision-detect:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        detected: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
