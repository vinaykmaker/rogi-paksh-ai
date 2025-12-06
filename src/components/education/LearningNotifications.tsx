import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Leaf, Sun, Moon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface LearningNotificationsProps {
  currentLanguage: string;
}

interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: 'morning' | 'afternoon' | 'evening';
  weeklyDigest: boolean;
  weatherAlerts: boolean;
  diseaseAlerts: boolean;
}

const STORAGE_KEY = 'agribot_notification_settings';

const LearningNotifications: React.FC<LearningNotificationsProps> = ({ currentLanguage }) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    dailyReminder: true,
    reminderTime: 'morning',
    weeklyDigest: true,
    weatherAlerts: true,
    diseaseAlerts: true
  });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    
    // Check notification permission
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: labels[currentLanguage as keyof typeof labels]?.notSupported || 'Notifications not supported',
        variant: 'destructive'
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPermissionGranted(true);
      saveSettings({ ...settings, enabled: true });
      toast({
        title: labels[currentLanguage as keyof typeof labels]?.enabled || 'Notifications enabled!'
      });
      
      // Show test notification
      new Notification('🌱 Agribot', {
        body: labels[currentLanguage as keyof typeof labels]?.testNotification || 'You will now receive farming tips!',
        icon: '/favicon.ico'
      });
    }
  };

  const toggleSetting = (key: keyof NotificationSettings, value: any) => {
    saveSettings({ ...settings, [key]: value });
  };

  const labels = {
    en: {
      title: 'Learning Notifications',
      description: 'Get daily farming tips and reminders',
      enable: 'Enable Notifications',
      dailyReminder: 'Daily Learning Reminder',
      reminderTime: 'Reminder Time',
      morning: 'Morning (6-9 AM)',
      afternoon: 'Afternoon (12-2 PM)',
      evening: 'Evening (6-8 PM)',
      weeklyDigest: 'Weekly Progress Summary',
      weatherAlerts: 'Weather Alerts',
      diseaseAlerts: 'Disease Outbreak Alerts',
      enabled: 'Notifications enabled!',
      notSupported: 'Notifications not supported in this browser',
      testNotification: 'You will now receive farming tips!'
    },
    hi: {
      title: 'सीखने की सूचनाएं',
      description: 'दैनिक खेती टिप्स और रिमाइंडर पाएं',
      enable: 'सूचनाएं सक्षम करें',
      dailyReminder: 'दैनिक सीखने का रिमाइंडर',
      reminderTime: 'रिमाइंडर समय',
      morning: 'सुबह (6-9 बजे)',
      afternoon: 'दोपहर (12-2 बजे)',
      evening: 'शाम (6-8 बजे)',
      weeklyDigest: 'साप्ताहिक प्रगति सारांश',
      weatherAlerts: 'मौसम अलर्ट',
      diseaseAlerts: 'रोग प्रकोप अलर्ट',
      enabled: 'सूचनाएं सक्षम!',
      notSupported: 'इस ब्राउज़र में सूचनाएं समर्थित नहीं',
      testNotification: 'अब आपको खेती टिप्स मिलेंगे!'
    },
    kn: {
      title: 'ಕಲಿಕೆ ಅಧಿಸೂಚನೆಗಳು',
      description: 'ದೈನಿಕ ಕೃಷಿ ಸಲಹೆಗಳು ಮತ್ತು ಜ್ಞಾಪನೆಗಳನ್ನು ಪಡೆಯಿರಿ',
      enable: 'ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ',
      dailyReminder: 'ದೈನಿಕ ಕಲಿಕೆ ಜ್ಞಾಪನೆ',
      reminderTime: 'ಜ್ಞಾಪನೆ ಸಮಯ',
      morning: 'ಬೆಳಿಗ್ಗೆ (6-9 AM)',
      afternoon: 'ಮಧ್ಯಾಹ್ನ (12-2 PM)',
      evening: 'ಸಂಜೆ (6-8 PM)',
      weeklyDigest: 'ಸಾಪ್ತಾಹಿಕ ಪ್ರಗತಿ ಸಾರಾಂಶ',
      weatherAlerts: 'ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳು',
      diseaseAlerts: 'ರೋಗ ಪ್ರಕೋಪ ಎಚ್ಚರಿಕೆಗಳು',
      enabled: 'ಅಧಿಸೂಚನೆಗಳು ಸಕ್ರಿಯ!',
      notSupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಅಧಿಸೂಚನೆಗಳು ಬೆಂಬಲಿತವಾಗಿಲ್ಲ',
      testNotification: 'ಈಗ ನೀವು ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ!'
    },
    te: {
      title: 'అభ్యసన నోటిఫికేషన్లు',
      description: 'రోజువారీ వ్యవసాయ చిట్కాలు మరియు రిమైండర్లు పొందండి',
      enable: 'నోటిఫికేషన్లు ఎనేబుల్ చేయండి',
      dailyReminder: 'రోజువారీ అభ్యసన రిమైండర్',
      reminderTime: 'రిమైండర్ సమయం',
      morning: 'ఉదయం (6-9 AM)',
      afternoon: 'మధ్యాహ్నం (12-2 PM)',
      evening: 'సాయంత్రం (6-8 PM)',
      weeklyDigest: 'వారపు పురోగతి సారాంశం',
      weatherAlerts: 'వాతావరణ హెచ్చరికలు',
      diseaseAlerts: 'వ్యాధి వ్యాప్తి హెచ్చరికలు',
      enabled: 'నోటిఫికేషన్లు ఎనేబుల్!',
      notSupported: 'ఈ బ్రౌజర్‌లో నోటిఫికేషన్లు సపోర్ట్ కావు',
      testNotification: 'ఇప్పుడు మీకు వ్యవసాయ చిట్కాలు వస్తాయి!'
    }
  };

  const t = labels[currentLanguage as keyof typeof labels] || labels.en;

  if (!settings.enabled && !permissionGranted) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </div>
          </div>
          <Button onClick={requestPermission} size="sm">
            {t.enable}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Reminder */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{t.dailyReminder}</span>
          </div>
          <Switch
            checked={settings.dailyReminder}
            onCheckedChange={(v) => toggleSetting('dailyReminder', v)}
          />
        </div>

        {/* Reminder Time */}
        {settings.dailyReminder && (
          <div className="ml-6 flex gap-2">
            {(['morning', 'afternoon', 'evening'] as const).map((time) => (
              <Badge
                key={time}
                variant={settings.reminderTime === time ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleSetting('reminderTime', time)}
              >
                {time === 'morning' && <Sun className="h-3 w-3 mr-1" />}
                {time === 'afternoon' && <Sun className="h-3 w-3 mr-1" />}
                {time === 'evening' && <Moon className="h-3 w-3 mr-1" />}
                {t[time]}
              </Badge>
            ))}
          </div>
        )}

        {/* Weekly Digest */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span>{t.weeklyDigest}</span>
          </div>
          <Switch
            checked={settings.weeklyDigest}
            onCheckedChange={(v) => toggleSetting('weeklyDigest', v)}
          />
        </div>

        {/* Weather Alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <span>{t.weatherAlerts}</span>
          </div>
          <Switch
            checked={settings.weatherAlerts}
            onCheckedChange={(v) => toggleSetting('weatherAlerts', v)}
          />
        </div>

        {/* Disease Alerts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-muted-foreground" />
            <span>{t.diseaseAlerts}</span>
          </div>
          <Switch
            checked={settings.diseaseAlerts}
            onCheckedChange={(v) => toggleSetting('diseaseAlerts', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningNotifications;
