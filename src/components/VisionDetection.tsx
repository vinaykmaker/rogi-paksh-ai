import React, { useState, useRef } from 'react';
import { Camera, Upload, Scan, Volume2, AlertTriangle, CheckCircle, Loader2, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DetectionResult {
  detected: boolean;
  disease?: {
    name: string;
    nameHi: string;
    nameKn: string;
  };
  severity?: string;
  confidence?: number;
  crop?: string;
  symptoms?: { en: string; hi: string; kn: string };
  treatment?: { en: string; hi: string; kn: string };
  prevention?: { en: string; hi: string; kn: string };
  organic_remedy?: { en: string; hi: string; kn: string };
  message?: { en: string; hi: string; kn: string };
  error?: string;
}

interface VisionDetectionProps {
  currentLanguage: string;
  translations: any;
}

const VisionDetection: React.FC<VisionDetectionProps> = ({ currentLanguage, translations }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 10MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('vision-detect', {
        body: { 
          imageBase64: selectedImage,
          language: currentLanguage 
        }
      });

      if (error) throw error;
      setResult(data);

      if (data.detected) {
        toast({
          title: "Analysis Complete",
          description: "Disease detected. See results below.",
        });
      }
    } catch (error) {
      console.error('Vision detection error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speakText = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const langCodes: { [key: string]: string } = {
      en: 'en-IN',
      hi: 'hi-IN',
      kn: 'kn-IN'
    };
    utterance.lang = langCodes[currentLanguage] || 'en-IN';
    utterance.rate = 0.85;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const getLocalizedText = (obj: { en: string; hi: string; kn: string } | undefined) => {
    if (!obj) return '';
    return obj[currentLanguage as keyof typeof obj] || obj.en;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'mild': return 'bg-yellow-500';
      case 'moderate': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card className="w-full shadow-strong border-2 border-primary/20">
      <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Scan className="h-7 w-7" />
          {currentLanguage === 'hi' ? '🔬 AI रोग पहचान' : 
           currentLanguage === 'kn' ? '🔬 AI ರೋಗ ಪತ್ತೆ' : 
           '🔬 AI Disease Detection'}
        </CardTitle>
        <p className="text-white/90 text-sm md:text-base">
          {currentLanguage === 'hi' ? 'अपने पौधे की फोटो अपलोड करें और तुरंत रोग की पहचान करें' :
           currentLanguage === 'kn' ? 'ನಿಮ್ಮ ಸಸ್ಯದ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಮತ್ತು ತಕ್ಷಣ ರೋಗ ಪತ್ತೆ ಮಾಡಿ' :
           'Upload your plant photo and get instant disease diagnosis'}
        </p>
      </CardHeader>

      <CardContent className="p-4 md:p-6 space-y-6">
        {/* Image Upload Section */}
        {!selectedImage ? (
          <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5">
            <ImageIcon className="h-16 w-16 mx-auto mb-4 text-primary/50" />
            <p className="text-muted-foreground mb-6 text-lg">
              {currentLanguage === 'hi' ? 'पौधे की पत्ती या प्रभावित भाग की तस्वीर लें' :
               currentLanguage === 'kn' ? 'ಸಸ್ಯದ ಎಲೆ ಅಥವಾ ಪ್ರಭಾವಿತ ಭಾಗದ ಚಿತ್ರ ತೆಗೆಯಿರಿ' :
               'Take a photo of the plant leaf or affected part'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => cameraInputRef.current?.click()}
                size="lg"
                className="touch-target text-lg gap-3"
              >
                <Camera className="h-6 w-6" />
                {currentLanguage === 'hi' ? 'कैमरा खोलें' :
                 currentLanguage === 'kn' ? 'ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ' :
                 'Open Camera'}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
                className="touch-target text-lg gap-3"
              >
                <Upload className="h-6 w-6" />
                {currentLanguage === 'hi' ? 'गैलरी से चुनें' :
                 currentLanguage === 'kn' ? 'ಗ್ಯಾಲರಿಯಿಂದ ಆಯ್ಕೆ' :
                 'Choose from Gallery'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Image Preview */}
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected plant"
                className="w-full max-h-80 object-contain rounded-xl border-2 border-primary/20"
              />
              <Button
                onClick={clearImage}
                variant="danger"
                size="icon"
                className="absolute top-2 right-2 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Analyze Button */}
            {!result && (
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                size="lg"
                className="w-full touch-target text-lg gap-3 h-14"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    {currentLanguage === 'hi' ? 'विश्लेषण हो रहा है...' :
                     currentLanguage === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...' :
                     'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Scan className="h-6 w-6" />
                    {currentLanguage === 'hi' ? '🔍 रोग की पहचान करें' :
                     currentLanguage === 'kn' ? '🔍 ರೋಗ ಪತ್ತೆ ಮಾಡಿ' :
                     '🔍 Detect Disease'}
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result.detected ? (
              <>
                {/* Disease Header */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 p-4 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
                      <div>
                        <h3 className="font-bold text-lg text-red-700 dark:text-red-400">
                          {currentLanguage === 'hi' ? result.disease?.nameHi :
                           currentLanguage === 'kn' ? result.disease?.nameKn :
                           result.disease?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {result.crop && `Crop: ${result.crop}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getSeverityColor(result.severity || '')} text-white`}>
                        {result.severity?.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">
                        {result.confidence}% {currentLanguage === 'hi' ? 'विश्वास' : currentLanguage === 'kn' ? 'ವಿಶ್ವಾಸ' : 'Confidence'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Symptoms */}
                {result.symptoms && (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          👁️ {currentLanguage === 'hi' ? 'लक्षण' : currentLanguage === 'kn' ? 'ಲಕ್ಷಣಗಳು' : 'Symptoms'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(getLocalizedText(result.symptoms))}
                        >
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getLocalizedText(result.symptoms)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Treatment */}
                {result.treatment && (
                  <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                          💊 {currentLanguage === 'hi' ? 'उपचार' : currentLanguage === 'kn' ? 'ಚಿಕಿತ್ಸೆ' : 'Treatment'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(getLocalizedText(result.treatment))}
                        >
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-foreground whitespace-pre-line">{getLocalizedText(result.treatment)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Organic Remedy */}
                {result.organic_remedy && (
                  <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                          🌿 {currentLanguage === 'hi' ? 'जैविक उपाय' : currentLanguage === 'kn' ? 'ಸಾವಯವ ಪರಿಹಾರ' : 'Organic Remedy'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(getLocalizedText(result.organic_remedy))}
                        >
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getLocalizedText(result.organic_remedy)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Prevention */}
                {result.prevention && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          🛡️ {currentLanguage === 'hi' ? 'रोकथाम' : currentLanguage === 'kn' ? 'ತಡೆಗಟ್ಟುವಿಕೆ' : 'Prevention'}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(getLocalizedText(result.prevention))}
                        >
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getLocalizedText(result.prevention)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* New Scan Button */}
                <Button onClick={clearImage} variant="outline" className="w-full touch-target">
                  {currentLanguage === 'hi' ? '📷 नई तस्वीर लें' :
                   currentLanguage === 'kn' ? '📷 ಹೊಸ ಚಿತ್ರ ತೆಗೆಯಿರಿ' :
                   '📷 Scan Another Image'}
                </Button>
              </>
            ) : (
              /* No Disease Detected */
              <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-xl border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-bold text-lg text-green-700 dark:text-green-400 mb-2">
                  {currentLanguage === 'hi' ? 'पौधा स्वस्थ दिखता है!' :
                   currentLanguage === 'kn' ? 'ಸಸ್ಯ ಆರೋಗ್ಯವಾಗಿ ಕಾಣುತ್ತದೆ!' :
                   'Plant Looks Healthy!'}
                </h3>
                <p className="text-muted-foreground">
                  {result.message ? getLocalizedText(result.message) :
                   (currentLanguage === 'hi' ? 'कोई बीमारी नहीं मिली। अगर समस्या बनी रहती है, तो किसी विशेषज्ञ से मिलें।' :
                    currentLanguage === 'kn' ? 'ಯಾವುದೇ ರೋಗ ಕಂಡುಬಂದಿಲ್ಲ. ಸಮಸ್ಯೆ ಮುಂದುವರಿದರೆ, ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.' :
                    'No disease detected. If problems persist, consult an expert.')}
                </p>
                <Button onClick={clearImage} variant="outline" className="mt-4 touch-target">
                  {currentLanguage === 'hi' ? '📷 दूसरी तस्वीर जांचें' :
                   currentLanguage === 'kn' ? '📷 ಇನ್ನೊಂದು ಚಿತ್ರ ಪರಿಶೀಲಿಸಿ' :
                   '📷 Check Another Image'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisionDetection;
