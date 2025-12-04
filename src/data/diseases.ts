import json
import google.generativeai as genai
from transformers import pipeline
from PIL import Image

# ------------------------------
# 1. Configure Gemini
# ------------------------------
genai.configure(api_key="")
MODEL = "gemini-1.5-pro"

# ------------------------------
# 2. Load crop recognition model
# ------------------------------
classifier = pipeline(
    "image-classification", 
    model="nateraw/plant-leaf-diseases",  # pretrained crop-leaf model
)

# ------------------------------
# 3. Detect crop from image
# ------------------------------
def get_crop_name(image_path):
    image = Image.open(image_path)
    result = classifier(image)[0]
    label = result["label"]

    # Extract crop name (cleaning label)
    crop = label.split("___")[0].replace("_", " ").title()
    return crop

# ------------------------------
# 4. Generate disease JSON using LLM
# ------------------------------
def generate_disease_data(crop):
    prompt = f"""
Generate JSON for crop disease in English, Hindi, Kannada.
Crop: {crop}

Return ONLY JSON format:
{{
  "disease": {{
    "en": "",
    "hi": "",
    "kn": ""
  }},
  "confidence": 0-100,
  "severity": "Low/Moderate/Severe",
  "crop": {{
    "en": "",
    "hi": "",
    "kn": ""
  }},
  "treatment": {{
    "en": "",
    "hi": "",
    "kn": ""
  }},
  "prevention": {{
    "en": "",
    "hi": "",
    "kn": ""
  }}
}}
"""

    response = genai.GenerativeModel(MODEL).generate_content(prompt)
    return response.text

# ------------------------------
# 5. Save file
# ------------------------------
def save_json(json_text, crop):
    try:
        data = json.loads(json_text)
        filename = f"{crop.lower().replace(' ','_')}_result.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✔ Saved as {filename}")
    except:
        print("⚠ JSON Parse Issue. Raw Output Below:\n", json_text)


# ------------------------------
# 6. Main Execution
# ------------------------------
if __name__ == "__main__":
    image_path = input("Enter image path: ")

    crop_name = get_crop_name(image_path)
    print("🌿 Detected Crop:", crop_name)

    json_output = generate_disease_data(crop_name)
    save_json(json_output, crop_name)
