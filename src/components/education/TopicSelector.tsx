import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TopicSelectorProps {
  currentLanguage: string;
  onSelectTopic: (topic: string, cropType?: string, season?: string) => void;
  isLoading: boolean;
}

const TOPICS = [
  { id: 'pest-control', icon: '🐛', en: 'Pest Control', hi: 'कीट नियंत्रण', kn: 'ಕೀಟ ನಿಯಂತ್ರಣ' },
  { id: 'soil-health', icon: '🌱', en: 'Soil Health', hi: 'मिट्टी स्वास्थ्य', kn: 'ಮಣ್ಣಿನ ಆರೋಗ್ಯ' },
  { id: 'water-management', icon: '💧', en: 'Water Management', hi: 'जल प्रबंधन', kn: 'ನೀರು ನಿರ್ವಹಣೆ' },
  { id: 'organic-farming', icon: '🌿', en: 'Organic Farming', hi: 'जैविक खेती', kn: 'ಸಾವಯವ ಕೃಷಿ' },
  { id: 'crop-rotation', icon: '🔄', en: 'Crop Rotation', hi: 'फसल चक्र', kn: 'ಬೆಳೆ ಚಕ್ರ' },
  { id: 'fertilizers', icon: '🧪', en: 'Natural Fertilizers', hi: 'प्राकृतिक खाद', kn: 'ನೈಸರ್ಗಿಕ ಗೊಬ್ಬರ' },
  { id: 'disease-prevention', icon: '🛡️', en: 'Disease Prevention', hi: 'रोग रोकथाम', kn: 'ರೋಗ ತಡೆಗಟ್ಟುವಿಕೆ' },
  { id: 'harvest-timing', icon: '🌾', en: 'Harvest Timing', hi: 'कटाई का समय', kn: 'ಕೊಯ್ಲು ಸಮಯ' },
];

const CROPS = [
  { id: 'rice', icon: '🍚', en: 'Rice', hi: 'चावल', kn: 'ಅಕ್ಕಿ' },
  { id: 'wheat', icon: '🌾', en: 'Wheat', hi: 'गेहूं', kn: 'ಗೋಧಿ' },
  { id: 'tomato', icon: '🍅', en: 'Tomato', hi: 'टमाटर', kn: 'ಟೊಮ್ಯಾಟೋ' },
  { id: 'cotton', icon: '🤍', en: 'Cotton', hi: 'कपास', kn: 'ಹತ್ತಿ' },
  { id: 'sugarcane', icon: '🎋', en: 'Sugarcane', hi: 'गन्ना', kn: 'ಕಬ್ಬು' },
  { id: 'ragi', icon: '🌿', en: 'Ragi/Millet', hi: 'रागी', kn: 'ರಾಗಿ' },
];

const SEASONS = [
  { id: 'kharif', en: 'Kharif (Monsoon)', hi: 'खरीफ (मानसून)', kn: 'ಖಾರಿಫ್ (ಮಾನ್ಸೂನ್)' },
  { id: 'rabi', en: 'Rabi (Winter)', hi: 'रबी (सर्दी)', kn: 'ರಬಿ (ಚಳಿಗಾಲ)' },
  { id: 'zaid', en: 'Zaid (Summer)', hi: 'जायद (गर्मी)', kn: 'ಜೈದ್ (ಬೇಸಿಗೆ)' },
];

const TopicSelector: React.FC<TopicSelectorProps> = ({ 
  currentLanguage, 
  onSelectTopic, 
  isLoading 
}) => {
  const [selectedCrop, setSelectedCrop] = React.useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = React.useState<string | null>(null);

  const getText = (item: { en: string; hi: string; kn: string }) => 
    item[currentLanguage as keyof typeof item] || item.en;

  const labels = {
    en: { chooseTopic: 'Choose a Topic', filterBy: 'Filter by Crop', season: 'Season', random: 'Random Lesson' },
    hi: { chooseTopic: 'विषय चुनें', filterBy: 'फसल के अनुसार', season: 'मौसम', random: 'कोई भी पाठ' },
    kn: { chooseTopic: 'ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ', filterBy: 'ಬೆಳೆ ಪ್ರಕಾರ', season: 'ಋತು', random: 'ಯಾದೃಚ್ಛಿಕ ಪಾಠ' }
  };
  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  const handleTopicClick = (topicId: string) => {
    const topic = TOPICS.find(t => t.id === topicId);
    const crop = CROPS.find(c => c.id === selectedCrop);
    const season = SEASONS.find(s => s.id === selectedSeason);
    
    onSelectTopic(
      topic?.en || topicId,
      crop?.en,
      season?.en
    );
  };

  return (
    <Card className="bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{t.chooseTopic}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Crop Filter */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t.filterBy}</p>
          <div className="flex flex-wrap gap-2">
            {CROPS.map(crop => (
              <Badge
                key={crop.id}
                variant={selectedCrop === crop.id ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
              >
                {crop.icon} {getText(crop)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Season Filter */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t.season}</p>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map(season => (
              <Badge
                key={season.id}
                variant={selectedSeason === season.id ? 'default' : 'outline'}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => setSelectedSeason(selectedSeason === season.id ? null : season.id)}
              >
                {getText(season)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {TOPICS.map(topic => (
            <Button
              key={topic.id}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
              onClick={() => handleTopicClick(topic.id)}
              disabled={isLoading}
            >
              <span className="text-2xl">{topic.icon}</span>
              <span className="text-xs text-center leading-tight">{getText(topic)}</span>
            </Button>
          ))}
        </div>

        {/* Random Lesson Button */}
        <Button 
          onClick={() => onSelectTopic('')} 
          className="w-full touch-target"
          disabled={isLoading}
        >
          🎲 {t.random}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TopicSelector;
