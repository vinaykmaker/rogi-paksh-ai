// Disease data for crop detection results
export interface DiseaseInfo {
  id: string;
  name: {
    en: string;
    hi: string;
    kn: string;
    te?: string;
  };
  description: {
    en: string;
    hi: string;
    kn: string;
    te?: string;
  };
  symptoms: string[];
  treatment: {
    en: string;
    hi: string;
    kn: string;
    te?: string;
  };
  prevention: {
    en: string;
    hi: string;
    kn: string;
    te?: string;
  };
  severity: 'low' | 'moderate' | 'severe';
  affectedCrops: string[];
}

export const commonDiseases: DiseaseInfo[] = [
  {
    id: 'late_blight',
    name: {
      en: 'Late Blight',
      hi: 'पछेती अंगमारी',
      kn: 'ತಡವಾದ ಕೊಳೆ',
      te: 'ఆలస్యంగా రావడం'
    },
    description: {
      en: 'A serious disease affecting potatoes and tomatoes caused by Phytophthora infestans',
      hi: 'आलू और टमाटर को प्रभावित करने वाली एक गंभीर बीमारी',
      kn: 'ಆಲೂಗಡ್ಡೆ ಮತ್ತು ಟೊಮೆಟೊಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರುವ ಗಂಭೀರ ರೋಗ',
      te: 'బంగాళాదుంపలు మరియు టమోటాలను ప్రభావితం చేసే తీవ్రమైన వ్యాధి'
    },
    symptoms: ['Dark water-soaked lesions', 'White mold on leaf undersides', 'Rapid plant death'],
    treatment: {
      en: 'Apply copper-based fungicide. Remove infected plants immediately.',
      hi: 'तांबे-आधारित कवकनाशी लगाएं। संक्रमित पौधों को तुरंत हटाएं।',
      kn: 'ತಾಮ್ರ ಆಧಾರಿತ ಶಿಲೀಂಧ್ರನಾಶಕ ಹಚ್ಚಿ. ಸೋಂಕಿತ ಸಸ್ಯಗಳನ್ನು ತಕ್ಷಣ ತೆಗೆಯಿರಿ.',
      te: 'రాగి ఆధారిత శిలీంద్ర నాశిని వాడండి. సోకిన మొక్కలను వెంటనే తొలగించండి.'
    },
    prevention: {
      en: 'Use certified disease-free seeds. Ensure proper spacing and drainage.',
      hi: 'प्रमाणित रोग-मुक्त बीजों का उपयोग करें। उचित दूरी और जल निकासी सुनिश्चित करें।',
      kn: 'ಪ್ರಮಾಣಿತ ರೋಗ-ಮುಕ್ತ ಬೀಜಗಳನ್ನು ಬಳಸಿ. ಸರಿಯಾದ ಅಂತರ ಮತ್ತು ಒಳಚರಂಡಿ ಖಚಿತಪಡಿಸಿ.',
      te: 'ధృవీకరించబడిన వ్యాధి-రహిత విత్తనాలు వాడండి. సరైన దూరం మరియు నీటి నిర్మాణం నిర్ధారించండి.'
    },
    severity: 'severe',
    affectedCrops: ['potato', 'tomato']
  },
  {
    id: 'powdery_mildew',
    name: {
      en: 'Powdery Mildew',
      hi: 'चूर्णिल आसिता',
      kn: 'ಪುಡಿ ಶಿಲೀಂಧ್ರ',
      te: 'పొడి బూజు'
    },
    description: {
      en: 'Fungal disease causing white powdery coating on leaves',
      hi: 'पत्तियों पर सफेद पाउडर जैसी परत बनाने वाली फफूंद बीमारी',
      kn: 'ಎಲೆಗಳ ಮೇಲೆ ಬಿಳಿ ಪುಡಿ ಲೇಪನ ಉಂಟುಮಾಡುವ ಶಿಲೀಂಧ್ರ ರೋಗ',
      te: 'ఆకులపై తెల్లని పొడి పూత కలిగించే శిలీంద్ర వ్యాధి'
    },
    symptoms: ['White powdery spots', 'Yellowing leaves', 'Stunted growth'],
    treatment: {
      en: 'Spray sulfur-based fungicide or neem oil solution.',
      hi: 'सल्फर-आधारित कवकनाशी या नीम तेल का घोल छिड़कें।',
      kn: 'ಗಂಧಕ ಆಧಾರಿತ ಶಿಲೀಂಧ್ರನಾಶಕ ಅಥವಾ ಬೇವಿನ ಎಣ್ಣೆ ದ್ರಾವಣ ಸಿಂಪಡಿಸಿ.',
      te: 'గంధకం ఆధారిత శిలీంద్ర నాశిని లేదా వేప నూనె ద్రావణం చల్లండి.'
    },
    prevention: {
      en: 'Improve air circulation. Avoid overhead watering.',
      hi: 'हवा का प्रवाह सुधारें। ऊपर से पानी देने से बचें।',
      kn: 'ಗಾಳಿ ಪ್ರಸರಣ ಸುಧಾರಿಸಿ. ಮೇಲಿನಿಂದ ನೀರುಣಿಸುವುದನ್ನು ತಪ್ಪಿಸಿ.',
      te: 'గాలి ప్రసరణ మెరుగుపరచండి. పైనుండి నీరు పోయడం నివారించండి.'
    },
    severity: 'moderate',
    affectedCrops: ['wheat', 'grapes', 'cucumber', 'squash']
  },
  {
    id: 'bacterial_leaf_blight',
    name: {
      en: 'Bacterial Leaf Blight',
      hi: 'जीवाणु पत्ती झुलसा',
      kn: 'ಬ್ಯಾಕ್ಟೀರಿಯಾ ಎಲೆ ಕೊಳೆ',
      te: 'బాక్టీరియా ఆకు తెగులు'
    },
    description: {
      en: 'Bacterial disease common in rice causing leaf yellowing and wilting',
      hi: 'चावल में आम जीवाणु रोग जो पत्तियों का पीलापन और मुरझाना पैदा करता है',
      kn: 'ಭತ್ತದಲ್ಲಿ ಸಾಮಾನ್ಯ ಬ್ಯಾಕ್ಟೀರಿಯಾ ರೋಗ ಎಲೆಗಳ ಹಳದಿ ಮತ್ತು ಬಾಡುವಿಕೆ ಉಂಟುಮಾಡುತ್ತದೆ',
      te: 'వరిలో సాధారణ బాక్టీరియా వ్యాధి ఆకులు పసుపు రంగు మరియు వాడిపోవడానికి కారణమవుతుంది'
    },
    symptoms: ['Yellow to white lesions', 'Leaf wilting', 'Grayish bacterial ooze'],
    treatment: {
      en: 'Apply copper hydroxide spray. Drain excess water from fields.',
      hi: 'कॉपर हाइड्रॉक्साइड स्प्रे लगाएं। खेतों से अतिरिक्त पानी निकालें।',
      kn: 'ತಾಮ್ರ ಹೈಡ್ರಾಕ್ಸೈಡ್ ಸ್ಪ್ರೇ ಹಾಕಿ. ಹೊಲಗಳಿಂದ ಹೆಚ್ಚುವರಿ ನೀರನ್ನು ಹೊರಹಾಕಿ.',
      te: 'కాపర్ హైడ్రాక్సైడ్ స్ప్రే వేయండి. పొలాల నుండి అదనపు నీటిని తీసివేయండి.'
    },
    prevention: {
      en: 'Use resistant varieties. Maintain balanced nitrogen fertilization.',
      hi: 'प्रतिरोधी किस्मों का उपयोग करें। संतुलित नाइट्रोजन उर्वरक बनाए रखें।',
      kn: 'ನಿರೋಧಕ ತಳಿಗಳನ್ನು ಬಳಸಿ. ಸಮತೋಲಿತ ಸಾರಜನಕ ಗೊಬ್ಬರ ನಿರ್ವಹಿಸಿ.',
      te: 'నిరోధక రకాలు వాడండి. సమతుల్య నత్రజని ఎరువులు నిర్వహించండి.'
    },
    severity: 'severe',
    affectedCrops: ['rice', 'wheat']
  }
];

export const getDiseaseById = (id: string): DiseaseInfo | undefined => {
  return commonDiseases.find(d => d.id === id);
};

export const getDiseasesByСrop = (crop: string): DiseaseInfo[] => {
  return commonDiseases.filter(d => 
    d.affectedCrops.some(c => c.toLowerCase() === crop.toLowerCase())
  );
};
