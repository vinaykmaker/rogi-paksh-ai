import React, { useState } from 'react';
import { 
  Search, Filter, Sparkles, TrendingUp, Clock, MapPin, 
  Leaf, Bug, Droplets, Sun, Thermometer, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TopicSelectorProps {
  currentLanguage: string;
  onSelectTopic: (topic: string, cropType?: string, season?: string, region?: string, diseaseHistory?: string) => void;
  isLoading: boolean;
  userHistory?: {
    recentTopics: string[];
    favoritesCrops: string[];
    region?: string;
  };
}

const TOPICS = [
  { id: 'pest-control', icon: '🐛', en: 'Pest Control', hi: 'कीट नियंत्रण', kn: 'ಕೀಟ ನಿಯಂತ್ರಣ', te: 'కీటక నియంత్రణ', category: 'protection' },
  { id: 'soil-health', icon: '🌱', en: 'Soil Health', hi: 'मिट्टी स्वास्थ्य', kn: 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ', te: 'నేల ఆరోగ్యం', category: 'basics' },
  { id: 'water-management', icon: '💧', en: 'Water Management', hi: 'जल प्रबंधन', kn: 'ನೀರು ನಿರ್ವಹಣೆ', te: 'నీటి నిర్వహణ', category: 'basics' },
  { id: 'organic-farming', icon: '🌿', en: 'Organic Farming', hi: 'जैविक खेती', kn: 'ಸಾವಯವ ಕೃಷಿ', te: 'సేంద్రీయ వ్యవసాయం', category: 'techniques' },
  { id: 'crop-rotation', icon: '🔄', en: 'Crop Rotation', hi: 'फसल चक्र', kn: 'ಬೆಳೆ ಚಕ್ರ', te: 'పంట మార్పిడి', category: 'techniques' },
  { id: 'fertilizers', icon: '🧪', en: 'Natural Fertilizers', hi: 'प्राकृतिक खाद', kn: 'ನೈಸರ್ಗಿಕ ಗೊಬ್ಬರ', te: 'సహజ ఎరువులు', category: 'basics' },
  { id: 'disease-prevention', icon: '🛡️', en: 'Disease Prevention', hi: 'रोग रोकथाम', kn: 'ರೋಗ ತಡೆಗಟ್ಟುವಿಕೆ', te: 'వ్యాధి నివారణ', category: 'protection' },
  { id: 'harvest-timing', icon: '🌾', en: 'Harvest Timing', hi: 'कटाई का समय', kn: 'ಕೊಯ್ಲು ಸಮಯ', te: 'పంట సమయం', category: 'timing' },
  { id: 'seed-selection', icon: '🌰', en: 'Seed Selection', hi: 'बीज चयन', kn: 'ಬೀಜ ಆಯ್ಕೆ', te: 'విత్తన ఎంపిక', category: 'basics' },
  { id: 'composting', icon: '♻️', en: 'Composting', hi: 'खाद बनाना', kn: 'ಕಾಂಪೋಸ್ಟಿಂಗ್', te: 'కంపోస్టింగ్', category: 'techniques' },
  { id: 'weather-farming', icon: '🌤️', en: 'Weather Farming', hi: 'मौसम खेती', kn: 'ಹವಾಮಾನ ಕೃಷಿ', te: 'వాతావరణ వ్యవసాయం', category: 'timing' },
  { id: 'storage', icon: '🏠', en: 'Crop Storage', hi: 'फसल भंडारण', kn: 'ಬೆಳೆ ಸಂಗ್ರಹ', te: 'పంట నిల్వ', category: 'post-harvest' },
];

const CROPS = [
  { id: 'rice', icon: '🍚', en: 'Rice', hi: 'चावल', kn: 'ಅಕ್ಕಿ', te: 'బియ్యం' },
  { id: 'wheat', icon: '🌾', en: 'Wheat', hi: 'गेहूं', kn: 'ಗೋಧಿ', te: 'గోధుమ' },
  { id: 'tomato', icon: '🍅', en: 'Tomato', hi: 'टमाटर', kn: 'ಟೊಮ್ಯಾಟೋ', te: 'టమాటా' },
  { id: 'cotton', icon: '🤍', en: 'Cotton', hi: 'कपास', kn: 'ಹತ್ತಿ', te: 'పత్తి' },
  { id: 'sugarcane', icon: '🎋', en: 'Sugarcane', hi: 'गन्ना', kn: 'ಕಬ್ಬು', te: 'చెరకు' },
  { id: 'ragi', icon: '🌿', en: 'Ragi/Millet', hi: 'रागी', kn: 'ರಾಗಿ', te: 'రాగి' },
  { id: 'mango', icon: '🥭', en: 'Mango', hi: 'आम', kn: 'ಮಾವು', te: 'మామిడి' },
  { id: 'coconut', icon: '🥥', en: 'Coconut', hi: 'नारियल', kn: 'ತೆಂಗಿನಕಾಯಿ', te: 'కొబ్బరి' },
  { id: 'groundnut', icon: '🥜', en: 'Groundnut', hi: 'मूंगफली', kn: 'ಕಡಲೆಕಾಯಿ', te: 'వేరుశెనగ' },
  { id: 'chilli', icon: '🌶️', en: 'Chilli', hi: 'मिर्च', kn: 'ಮೆಣಸಿನಕಾಯಿ', te: 'మిర్చి' },
];

const SEASONS = [
  { id: 'kharif', icon: '🌧️', en: 'Kharif (Monsoon)', hi: 'खरीफ (मानसून)', kn: 'ಖಾರಿಫ್ (ಮಾನ್ಸೂನ್)', te: 'ఖరీఫ్ (వర్షాకాలం)' },
  { id: 'rabi', icon: '❄️', en: 'Rabi (Winter)', hi: 'रबी (सर्दी)', kn: 'ರಬಿ (ಚಳಿಗಾಲ)', te: 'రబీ (శీతాకాలం)' },
  { id: 'zaid', icon: '☀️', en: 'Zaid (Summer)', hi: 'जायद (गर्मी)', kn: 'ಜೈದ್ (ಬೇಸಿಗೆ)', te: 'జైద్ (వేసవి)' },
];

const REGIONS = [
  { id: 'karnataka', en: 'Karnataka', hi: 'कर्नाटक', kn: 'ಕರ್ನಾಟಕ', te: 'కర్ణాటక' },
  { id: 'maharashtra', en: 'Maharashtra', hi: 'महाराष्ट्र', kn: 'ಮಹಾರಾಷ್ಟ್ರ', te: 'మహారాష్ట్ర' },
  { id: 'tamilnadu', en: 'Tamil Nadu', hi: 'तमिलनाडु', kn: 'ತಮಿಳುನಾಡು', te: 'తమిళనాడు' },
  { id: 'andhra', en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', kn: 'ಆಂಧ್ರ ಪ್ರದೇಶ', te: 'ఆంధ్ర ప్రదేశ్' },
  { id: 'telangana', en: 'Telangana', hi: 'तेलंगाना', kn: 'ತೆಲಂಗಾಣ', te: 'తెలంగాణ' },
  { id: 'punjab', en: 'Punjab', hi: 'पंजाब', kn: 'ಪಂಜಾಬ್', te: 'పంజాబ్' },
  { id: 'up', en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', kn: 'ಉತ್ತರ ಪ್ರದೇಶ', te: 'ఉత్తర ప్రదేశ్' },
];

const SKILL_LEVELS = [
  { id: 'beginner', en: 'Beginner', hi: 'शुरुआती', kn: 'ಆರಂಭಿಕ', te: 'ప్రారంభ' },
  { id: 'intermediate', en: 'Intermediate', hi: 'मध्यम', kn: 'ಮಧ್ಯಮ', te: 'మధ్యస్థ' },
  { id: 'advanced', en: 'Advanced', hi: 'उन्नत', kn: 'ಮುಂದುವರಿದ', te: 'అధునాతన' },
];

const EnhancedTopicSelector: React.FC<TopicSelectorProps> = ({ 
  currentLanguage, 
  onSelectTopic, 
  isLoading,
  userHistory
}) => {
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(userHistory?.region || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const getText = (item: { en: string; hi: string; kn: string; te?: string }) => 
    item[currentLanguage as keyof typeof item] || item.en;

  const labels = {
    en: { 
      chooseTopic: 'Choose a Learning Topic', 
      filterBy: 'Filter by Crop', 
      season: 'Season',
      region: 'Your Region',
      random: '✨ Surprise Me!',
      trending: 'Trending Now',
      forYou: 'For You',
      all: 'All Topics',
      search: 'Search topics...',
      recommended: 'Recommended',
      protection: 'Plant Protection',
      basics: 'Farming Basics',
      techniques: 'Techniques',
      timing: 'Timing & Weather',
      postHarvest: 'Post Harvest'
    },
    hi: { 
      chooseTopic: 'सीखने का विषय चुनें', 
      filterBy: 'फसल के अनुसार', 
      season: 'मौसम',
      region: 'आपका क्षेत्र',
      random: '✨ कोई भी पाठ',
      trending: 'ट्रेंडिंग',
      forYou: 'आपके लिए',
      all: 'सभी विषय',
      search: 'विषय खोजें...',
      recommended: 'सुझाया गया',
      protection: 'फसल सुरक्षा',
      basics: 'खेती की मूल बातें',
      techniques: 'तकनीक',
      timing: 'समय और मौसम',
      postHarvest: 'कटाई के बाद'
    },
    kn: { 
      chooseTopic: 'ಕಲಿಕೆ ವಿಷಯ ಆಯ್ಕೆಮಾಡಿ', 
      filterBy: 'ಬೆಳೆ ಪ್ರಕಾರ', 
      season: 'ಋತು',
      region: 'ನಿಮ್ಮ ಪ್ರದೇಶ',
      random: '✨ ಯಾದೃಚ್ಛಿಕ',
      trending: 'ಟ್ರೆಂಡಿಂಗ್',
      forYou: 'ನಿಮಗಾಗಿ',
      all: 'ಎಲ್ಲಾ ವಿಷಯಗಳು',
      search: 'ವಿಷಯಗಳನ್ನು ಹುಡುಕಿ...',
      recommended: 'ಶಿಫಾರಸು',
      protection: 'ಬೆಳೆ ರಕ್ಷಣೆ',
      basics: 'ಕೃಷಿ ಮೂಲಭೂತ',
      techniques: 'ತಂತ್ರಗಳು',
      timing: 'ಸಮಯ ಮತ್ತು ಹವಾಮಾನ',
      postHarvest: 'ಕೊಯ್ಲು ನಂತರ'
    },
    te: {
      chooseTopic: 'అభ్యసన అంశాన్ని ఎంచుకోండి',
      filterBy: 'పంట ద్వారా',
      season: 'సీజన్',
      region: 'మీ ప్రాంతం',
      random: '✨ ఆశ్చర్యం!',
      trending: 'ట్రెండింగ్',
      forYou: 'మీ కోసం',
      all: 'అన్ని అంశాలు',
      search: 'అంశాలను వెతకండి...',
      recommended: 'సిఫార్సు',
      protection: 'పంట రక్షణ',
      basics: 'వ్యవసాయ ప్రాథమికాలు',
      techniques: 'పద్ధతులు',
      timing: 'సమయం & వాతావరణం',
      postHarvest: 'పంట తర్వాత'
    }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  const handleTopicClick = (topicId: string) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const crop = CROPS.find(c => c.id === selectedCrop);
    const season = SEASONS.find(s => s.id === selectedSeason);
    const region = REGIONS.find(r => r.id === selectedRegion);
    
    onSelectTopic(
      topic?.en || topicId,
      crop?.en,
      season?.en,
      region?.en
    );
  };

  const filteredTopics = TOPICS.filter(topic => {
    const matchesSearch = searchQuery === '' || 
      getText(topic).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || topic.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Get current season recommendation
  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 5 && month <= 9) return 'kharif';
    if (month >= 9 || month <= 2) return 'rabi';
    return 'zaid';
  };

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t.chooseTopic}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full flex-wrap h-auto">
            <TabsTrigger value="all" className="flex-1">
              {t.all}
            </TabsTrigger>
            <TabsTrigger value="protection" className="flex-1">
              <Bug className="h-4 w-4 mr-1" />
              {t.protection}
            </TabsTrigger>
            <TabsTrigger value="basics" className="flex-1">
              <Leaf className="h-4 w-4 mr-1" />
              {t.basics}
            </TabsTrigger>
            <TabsTrigger value="techniques" className="flex-1">
              <Sparkles className="h-4 w-4 mr-1" />
              {t.techniques}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Crop Filter */}
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Leaf className="h-4 w-4" />
            {t.filterBy}
          </p>
          <div className="flex flex-wrap gap-2">
            {CROPS.map(crop => (
              <Badge
                key={crop.id}
                variant={selectedCrop === crop.id ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3 hover:bg-primary/10 transition-colors"
                onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
              >
                {crop.icon} {getText(crop)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Season Filter */}
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {t.season}
          </p>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map(season => (
              <Badge
                key={season.id}
                variant={selectedSeason === season.id ? 'default' : 'outline'}
                className={`cursor-pointer py-1.5 px-3 hover:bg-primary/10 transition-colors ${
                  getCurrentSeason() === season.id ? 'ring-2 ring-primary/50' : ''
                }`}
                onClick={() => setSelectedSeason(selectedSeason === season.id ? null : season.id)}
              >
                {season.icon} {getText(season)}
                {getCurrentSeason() === season.id && (
                  <span className="ml-1 text-xs">📍</span>
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Region Filter */}
        <div>
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {t.region}
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(region => (
              <Badge
                key={region.id}
                variant={selectedRegion === region.id ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3 hover:bg-primary/10 transition-colors"
                onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
              >
                {getText(region)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {filteredTopics.map(topic => (
            <Button
              key={topic.id}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary transition-all"
              onClick={() => handleTopicClick(topic.id)}
              disabled={isLoading}
            >
              <span className="text-3xl">{topic.icon}</span>
              <span className="text-xs text-center leading-tight font-medium">{getText(topic)}</span>
            </Button>
          ))}
        </div>

        {/* Random Lesson Button */}
        <Button 
          onClick={() => onSelectTopic('', selectedCrop ? CROPS.find(c => c.id === selectedCrop)?.en : undefined, 
            selectedSeason ? SEASONS.find(s => s.id === selectedSeason)?.en : undefined,
            selectedRegion ? REGIONS.find(r => r.id === selectedRegion)?.en : undefined
          )} 
          className="w-full touch-target text-lg"
          size="lg"
          disabled={isLoading}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          {t.random}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedTopicSelector;
