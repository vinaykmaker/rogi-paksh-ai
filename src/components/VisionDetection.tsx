import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Scan, Volume2, AlertTriangle, CheckCircle, Loader2, X, ImageIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSpeechSynthesis, getLocalizedText } from '@/hooks/useSpeechSynthesis';
import { compressImage, analyzeImageQuality, validateImage } from '@/lib/imageUtils';

interface DetectionResult {
  detected: boolean;
  disease?: { name: string; nameHi: string; nameKn: string };
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

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const VisionDetection: React.FC<VisionDetectionProps> = ({ currentLanguage, translations }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [imageQuality, setImageQuality] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { toggle, isSpeaking } = useSpeechSynthesis({ language: currentLanguage });

  const getText = useCallback((obj: { en: string; hi: string; kn: string } | undefined) => 
    getLocalizedText(obj, currentLanguage), [currentLanguage]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      toast({
        title: currentLanguage === 'hi' ? 'अमान्य फ़ाइल' : currentLanguage === 'kn' ? 'ಅಮಾನ್ಯ ಫೈಲ್' : 'Invalid File',
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      // Compress if needed
      const imageData = file.size > 1024 * 1024 
        ? await compressImage(file)
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });

      setSelectedImage(imageData);
      setResult(null);

      // Analyze image quality
      const quality = await analyzeImageQuality(imageData);
      setImageQuality(quality);

      if (quality.score < 40) {
        toast({
          title: currentLanguage === 'hi' ? 'छवि गुणवत्ता कम है' : currentLanguage === 'kn' ? 'ಚಿತ್ರ ಗುಣಮಟ್ಟ ಕಡಿಮೆ' : 'Low Image Quality',
          description: quality.recommendations[0] || 'Try with better lighting',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Image processing error:', error);
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
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
          title: currentLanguage === 'hi' ? 'विश्लेषण पूर्ण' : currentLanguage === 'kn' ? 'ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣ' : 'Analysis Complete',
          description: currentLanguage === 'hi' ? 'रोग का पता चला। नीचे परिणाम देखें।' : currentLanguage === 'kn' ? 'ರೋಗ ಪತ್ತೆಯಾಗಿದೆ. ಕೆಳಗೆ ಫಲಿತಾಂಶ ನೋಡಿ.' : 'Disease detected. See results below.',
        });
      }
    } catch (error) {
      console.error('Vision detection error:', error);
      toast({
        title: currentLanguage === 'hi' ? 'विश्लेषण विफल' : currentLanguage === 'kn' ? 'ವಿಶ್ಲೇಷಣೆ ವಿಫಲ' : 'Analysis Failed',
        description: currentLanguage === 'hi' ? 'कृपया पुनः प्रयास करें' : currentLanguage === 'kn' ? 'ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Please try again',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
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
    setImageQuality(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const labels = {
    en: { title: '🔬 AI Disease Detection', subtitle: 'Upload photo for instant diagnosis', camera: 'Open Camera', gallery: 'Choose Photo', detect: '🔍 Detect Disease', analyzing: 'Analyzing...', symptoms: 'Symptoms', treatment: 'Treatment', organic: 'Organic Remedy', prevention: 'Prevention', healthy: 'Plant Looks Healthy!', healthyMsg: 'No disease detected. If problems persist, consult an expert.', scanAnother: '📷 Scan Another', confidence: 'Confidence', crop: 'Crop' },
    hi: { title: '🔬 AI रोग पहचान', subtitle: 'तुरंत निदान के लिए फोटो अपलोड करें', camera: 'कैमरा खोलें', gallery: 'फोटो चुनें', detect: '🔍 रोग पहचानें', analyzing: 'विश्लेषण हो रहा है...', symptoms: 'लक्षण', treatment: 'उपचार', organic: 'जैविक उपाय', prevention: 'रोकथाम', healthy: 'पौधा स्वस्थ दिखता है!', healthyMsg: 'कोई बीमारी नहीं मिली। समस्या बनी रहे तो विशेषज्ञ से मिलें।', scanAnother: '📷 दूसरी फोटो जांचें', confidence: 'विश्वास', crop: 'फसल' },
    kn: { title: '🔬 AI ರೋಗ ಪತ್ತೆ', subtitle: 'ತಕ್ಷಣ ರೋಗನಿರ್ಣಯಕ್ಕಾಗಿ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', camera: 'ಕ್ಯಾಮೆರಾ ತೆರೆಯಿರಿ', gallery: 'ಫೋಟೋ ಆಯ್ಕೆ', detect: '🔍 ರೋಗ ಪತ್ತೆ ಮಾಡಿ', analyzing: 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...', symptoms: 'ಲಕ್ಷಣಗಳು', treatment: 'ಚಿಕಿತ್ಸೆ', organic: 'ಸಾವಯವ ಪರಿಹಾರ', prevention: 'ತಡೆಗಟ್ಟುವಿಕೆ', healthy: 'ಸಸ್ಯ ಆರೋಗ್ಯವಾಗಿದೆ!', healthyMsg: 'ಯಾವುದೇ ರೋಗ ಕಂಡುಬಂದಿಲ್ಲ. ಸಮಸ್ಯೆ ಮುಂದುವರಿದರೆ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.', scanAnother: '📷 ಇನ್ನೊಂದು ಫೋಟೋ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', confidence: 'ವಿಶ್ವಾಸ', crop: 'ಬೆಳೆ' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  return (
    <Card className="w-full shadow-strong border-2 border-primary/20">
      <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
          <Scan className="h-7 w-7" />
          {t.title}
        </CardTitle>
        <p className="text-white/90 text-sm md:text-base">{t.subtitle}</p>
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
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
              <Button onClick={() => cameraInputRef.current?.click()} size="lg" className="touch-target text-lg gap-3">
                <Camera className="h-6 w-6" />
                {t.camera}
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg" className="touch-target text-lg gap-3">
                <Upload className="h-6 w-6" />
                {t.gallery}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative">
              <img src={selectedImage} alt="Selected plant" className="w-full max-h-80 object-contain rounded-xl border-2 border-primary/20" />
              <Button onClick={clearImage} variant="danger" size="icon" className="absolute top-2 right-2 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Image Quality Warning */}
            {imageQuality && imageQuality.score < 60 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {imageQuality.recommendations[0]}
                </p>
              </div>
            )}

            {/* Analyze Button */}
            {!result && (
              <Button onClick={analyzeImage} disabled={isAnalyzing} size="lg" className="w-full touch-target text-lg gap-3 h-14">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Scan className="h-6 w-6" />
                    {t.detect}
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
                        {result.crop && <p className="text-sm text-muted-foreground">{t.crop}: {result.crop}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getSeverityColor(result.severity || '')} text-white`}>
                        {result.severity?.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{result.confidence}% {t.confidence}</span>
                    </div>
                  </div>
                </div>

                {/* Info Cards */}
                {result.symptoms && (
                  <Card className="border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">👁️ {t.symptoms}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggle(getText(result.symptoms))}>
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getText(result.symptoms)}</p>
                    </CardContent>
                  </Card>
                )}

                {result.treatment && (
                  <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">💊 {t.treatment}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggle(getText(result.treatment))}>
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-foreground whitespace-pre-line">{getText(result.treatment)}</p>
                    </CardContent>
                  </Card>
                )}

                {result.organic_remedy && (
                  <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">🌿 {t.organic}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggle(getText(result.organic_remedy))}>
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getText(result.organic_remedy)}</p>
                    </CardContent>
                  </Card>
                )}

                {result.prevention && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">🛡️ {t.prevention}</h4>
                        <Button variant="ghost" size="sm" onClick={() => toggle(getText(result.prevention))}>
                          <Volume2 className={`h-4 w-4 ${isSpeaking ? 'animate-pulse text-primary' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{getText(result.prevention)}</p>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={clearImage} variant="outline" className="w-full touch-target">
                  {t.scanAnother}
                </Button>
              </>
            ) : (
              /* Healthy Plant */
              <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-xl border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-bold text-lg text-green-700 dark:text-green-400 mb-2">{t.healthy}</h3>
                <p className="text-muted-foreground">
                  {result.message ? getText(result.message) : t.healthyMsg}
                </p>
                <Button onClick={clearImage} variant="outline" className="mt-4 touch-target">
                  {t.scanAnother}
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
