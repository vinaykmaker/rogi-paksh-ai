import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Scan, CheckCircle, AlertTriangle, Lightbulb, Volume2, Loader2, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage, validateImage } from '@/lib/imageUtils';

interface DetectionSectionProps {
  translations: any;
  currentLanguage: string;
}

interface DetectionResult {
  crop: string;
  issue: string;
  category: string;
  severity: string;
  confidence: string;
  verification_notes?: string;
  alternative_diagnosis?: string;
  confidence_reason?: string;
  description: {
    english: string;
    hindi: string;
    kannada: string;
  };
  solutions: {
    english: string;
    hindi: string;
    kannada: string;
  };
  prevention?: {
    english: string;
    hindi: string;
    kannada: string;
  };
  tts: {
    english: string;
    hindi: string;
    kannada: string;
  };
  action_urgency?: string;
  expert_consultation?: boolean;
  timestamp: string;
}

const DetectionSection: React.FC<DetectionSectionProps> = ({ translations, currentLanguage }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [speakingLang, setSpeakingLang] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsCompressing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawImage = e.target?.result as string;
        
        // Compress for mobile optimization
        const compressed = await compressImage(rawImage, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.85,
          maxSizeKB: 600
        });
        
        setSelectedImage(compressed);
        setDetectionResult(null);
        setRetryCount(0);
        setIsCompressing(false);
        toast.success('📷 Image ready for analysis');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error('Failed to process image. Please try again.');
      setIsCompressing(false);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('📷 Camera access denied. Please allow camera permissions or use upload.');
    }
  };

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  }, [cameraStream]);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedImage(imageData);
        setDetectionResult(null);
        closeCamera();
        toast.success('📸 Image captured successfully!');
      }
    }
  };

  const handleDetection = async () => {
    if (!selectedImage) return;
    
    setIsDetecting(true);
    
    try {
      console.log('Sending image for AI detection...');
      
      const { data, error } = await supabase.functions.invoke('detect-disease', {
        body: { imageData: selectedImage }
      });

      if (error) {
        console.error('Detection error:', error);
        
        // Handle specific error types
        if (error.message?.includes('429') || error.message?.includes('rate')) {
          toast.error('🕐 Too many requests. Please wait a moment and try again.');
        } else if (error.message?.includes('timeout')) {
          toast.error('⏱️ Request timed out. Try with a smaller image.');
        } else {
          toast.error('❌ Detection failed. Please try again.');
        }
        
        setRetryCount(prev => prev + 1);
        return;
      }

      // Check for error in response body
      if (data?.error) {
        console.error('Detection error in response:', data.error);
        toast.error(data.error);
        setRetryCount(prev => prev + 1);
        return;
      }

      console.log('Detection result:', data);
      setDetectionResult(data as DetectionResult);
      setRetryCount(0);
      toast.success(`🌱 Detected: ${data.issue || data.crop || 'Analysis complete'}`);
      
    } catch (error) {
      console.error('Error during detection:', error);
      toast.error('❌ An error occurred. Please try again.');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSpeak = (lang: 'english' | 'hindi' | 'kannada') => {
    if (!detectionResult || speakingLang) return;

    const textToSpeak = detectionResult.tts[lang];
    if (!textToSpeak) {
      toast.error('TTS text not available');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const langCodes: { [key: string]: string } = {
      english: 'en-US',
      hindi: 'hi-IN',
      kannada: 'kn-IN'
    };
    utterance.lang = langCodes[lang];
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingLang(lang);
    utterance.onend = () => setSpeakingLang(null);
    utterance.onerror = () => setSpeakingLang(null);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeakingLang(null);
  };

  return (
    <section id="detect" className="py-12 md:py-20 bg-gradient-earth">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-foreground mb-3">
              🌾 {translations.detection.title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              📸 {translations.detection.subtitle}
            </p>
          </div>

          {/* Camera Modal */}
          {isCameraOpen && (
            <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
              <div className="relative w-full max-w-lg">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full rounded-2xl border-4 border-primary"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-4 mt-6 justify-center">
                  <Button 
                    variant="danger" 
                    size="lg"
                    onClick={closeCamera}
                    className="text-lg px-6 py-6"
                  >
                    <X className="h-6 w-6 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    variant="hero" 
                    size="lg"
                    onClick={captureImage}
                    className="text-lg px-8 py-6"
                  >
                    <Camera className="h-6 w-6 mr-2" />
                    📸 Capture
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Input Section */}
            <Card className="shadow-medium">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Scan className="h-6 w-6 text-primary" />
                  🌿 Upload Crop Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-6">
                {/* Image Preview */}
                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected crop"
                      className="w-full h-48 md:h-64 object-cover rounded-xl border-3 border-primary/30"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-destructive/90 transition-fast shadow-lg"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border-3 border-dashed border-primary/40 rounded-xl p-8 md:p-12 text-center bg-primary/5">
                    <Camera className="h-16 w-16 md:h-20 md:w-20 text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground text-base md:text-lg">
                      👇 Choose an option below
                    </p>
                  </div>
                )}

                {/* Action Buttons - Large & Farmer Friendly */}
                <div className="space-y-3">
                  <Button 
                    variant="farmer" 
                    size="lg" 
                    onClick={openCamera}
                    className="w-full text-lg py-6 md:py-7"
                  >
                    <Camera className="h-6 w-6 mr-3" />
                    📷 {translations.detection.buttons.camera}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-lg py-6 md:py-7 border-2"
                  >
                    <Upload className="h-6 w-6 mr-3" />
                    📁 {translations.detection.buttons.upload}
                  </Button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Detect Button */}
                {selectedImage && (
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleDetection}
                    disabled={isDetecting}
                    className="w-full text-xl py-7 md:py-8"
                  >
                    {isDetecting ? (
                      <>
                        <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                        🔬 Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Scan className="h-6 w-6 mr-3" />
                        🔍 {translations.detection.buttons.detect}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="shadow-medium">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <CheckCircle className="h-6 w-6 text-success" />
                  📊 {translations.detection.results.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectionResult ? (
                  <div className="space-y-5">
                    {/* Disease Info Header */}
                    <div className="space-y-3 bg-primary/10 p-4 rounded-xl">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-xl md:text-2xl font-bold text-foreground">
                          🪲 {detectionResult.issue}
                        </h3>
                        <Badge 
                          variant={parseInt(detectionResult.confidence) > 90 ? "default" : "secondary"}
                          className="text-base px-3 py-1"
                        >
                          {detectionResult.confidence}% ✓
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          🌾 {detectionResult.crop}
                        </Badge>
                        <Badge 
                          variant={detectionResult.severity === 'High' ? 'destructive' : detectionResult.severity === 'Medium' ? 'secondary' : 'default'}
                          className="text-sm px-3 py-1"
                        >
                          ⚠️ {detectionResult.severity}
                        </Badge>
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          📂 {detectionResult.category}
                        </Badge>
                      </div>
                    </div>

                    {/* TTS Buttons for All 3 Languages */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">🔊 Listen in your language:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={speakingLang === 'english' ? 'default' : 'outline'}
                          size="lg"
                          onClick={() => speakingLang ? stopSpeaking() : handleSpeak('english')}
                          className="flex-col h-auto py-3 text-sm"
                        >
                          <Volume2 className={`h-5 w-5 mb-1 ${speakingLang === 'english' ? 'animate-pulse' : ''}`} />
                          🟢 English
                        </Button>
                        <Button
                          variant={speakingLang === 'hindi' ? 'default' : 'outline'}
                          size="lg"
                          onClick={() => speakingLang ? stopSpeaking() : handleSpeak('hindi')}
                          className="flex-col h-auto py-3 text-sm"
                        >
                          <Volume2 className={`h-5 w-5 mb-1 ${speakingLang === 'hindi' ? 'animate-pulse' : ''}`} />
                          🟠 हिंदी
                        </Button>
                        <Button
                          variant={speakingLang === 'kannada' ? 'default' : 'outline'}
                          size="lg"
                          onClick={() => speakingLang ? stopSpeaking() : handleSpeak('kannada')}
                          className="flex-col h-auto py-3 text-sm"
                        >
                          <Volume2 className={`h-5 w-5 mb-1 ${speakingLang === 'kannada' ? 'animate-pulse' : ''}`} />
                          🟣 ಕನ್ನಡ
                        </Button>
                      </div>
                    </div>

                    {/* TRILINGUAL RESULTS - ALL 3 LANGUAGES */}
                    
                    {/* 🟢 ENGLISH Section */}
                    <div className="space-y-2 border-l-4 border-green-500 pl-3 bg-green-50 dark:bg-green-950/20 p-3 rounded-r-xl">
                      <h4 className="font-bold text-green-700 dark:text-green-400 text-base">🟢 English</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-semibold">🔍 What We Detected:</span> {detectionResult.description.english}</p>
                        <p><span className="font-semibold">💊 Treatment & Solutions:</span> {detectionResult.solutions.english}</p>
                        <p><span className="font-semibold">🛡️ Prevention:</span> {detectionResult.prevention?.english || 'Practice crop rotation, proper spacing, field hygiene, and use resistant varieties.'}</p>
                        {detectionResult.expert_consultation && (
                          <p className="text-amber-600 font-semibold">⚠️ Expert consultation recommended for this case.</p>
                        )}
                      </div>
                    </div>

                    {/* 🟣 KANNADA Section */}
                    <div className="space-y-2 border-l-4 border-purple-500 pl-3 bg-purple-50 dark:bg-purple-950/20 p-3 rounded-r-xl">
                      <h4 className="font-bold text-purple-700 dark:text-purple-400 text-base">🟣 ಕನ್ನಡ (Kannada)</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-semibold">🔍 ಪತ್ತೆ ಮಾಡಲಾದ ಸಮಸ್ಯೆ:</span> {detectionResult.description.kannada}</p>
                        <p><span className="font-semibold">💊 ಚಿಕಿತ್ಸೆ ಮತ್ತು ಪರಿಹಾರಗಳು:</span> {detectionResult.solutions.kannada}</p>
                        <p><span className="font-semibold">🛡️ ಮುನ್ನೆಚ್ಚರಿಕೆ ಸಲಹೆಗಳು:</span> ಸಾಮಾನ್ಯ ಮುನ್ನೆಚ್ಚರಿಕೆ: ಬೆಳೆಯ ಪರಿವರ್ತನೆ, ಸರಿಯಾದ ಅಂತರ, ಹೊಲ ಸ್ವಚ್ಛತೆ, ಪ್ರತಿರೋಧಕ ಜಾತಿಗಳು.</p>
                      </div>
                    </div>

                    {/* 🟠 HINDI Section */}
                    <div className="space-y-2 border-l-4 border-orange-500 pl-3 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-r-xl">
                      <h4 className="font-bold text-orange-700 dark:text-orange-400 text-base">🟠 हिंदी (Hindi)</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-semibold">🔍 हमने क्या पाया:</span> {detectionResult.description.hindi}</p>
                        <p><span className="font-semibold">💊 उपचार और समाधान:</span> {detectionResult.solutions.hindi}</p>
                        <p><span className="font-semibold">🛡️ रोकथाम सुझाव:</span> सामान्य रोकथाम: फसल चक्रीकरण, उचित दूरी, खेत स्वच्छता, रोग-प्रतिरोधी किस्में।</p>
                      </div>
                    </div>

                    {/* Timestamp & Retry */}
                    <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                      <span>⏰ {new Date(detectionResult.timestamp).toLocaleString()}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetectionResult(null)}
                        className="text-xs"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        New Detection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 md:py-12">
                    <Scan className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-base md:text-lg">
                      📸 Upload an image and click detect
                    </p>
                    <p className="text-muted-foreground/70 text-sm mt-2">
                      AI will analyze your crop in seconds
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DetectionSection;
