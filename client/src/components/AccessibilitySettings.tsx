import { Settings, Type, Contrast, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export function AccessibilitySettings() {
  const { textSize, setTextSize, highContrast, setHighContrast, language, setLanguage } = useAccessibility();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-accessibility-settings"
          aria-label="Accessibility settings"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" data-testid="popover-accessibility-settings">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Accessibility Settings</h4>
            <p className="text-sm text-muted-foreground">
              Customize display and language preferences
            </p>
          </div>

          <Separator />

          {/* Text Size */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Label htmlFor="text-size" className="text-sm font-medium">
                Text Size
              </Label>
            </div>
            <RadioGroup
              id="text-size"
              value={textSize}
              onValueChange={(value) => setTextSize(value as any)}
              aria-label="Select text size"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="size-normal" data-testid="radio-text-size-normal" />
                <Label htmlFor="size-normal" className="text-sm cursor-pointer">
                  Normal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="size-large" data-testid="radio-text-size-large" />
                <Label htmlFor="size-large" className="text-base cursor-pointer">
                  Large
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="extra-large" id="size-extra-large" data-testid="radio-text-size-extra-large" />
                <Label htmlFor="size-extra-large" className="text-lg cursor-pointer">
                  Extra Large
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* High Contrast */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center gap-2">
              <Contrast className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Label htmlFor="high-contrast" className="text-sm font-medium cursor-pointer">
                High Contrast Mode
              </Label>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={setHighContrast}
              data-testid="switch-high-contrast"
              aria-label="Toggle high contrast mode"
            />
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Label htmlFor="language" className="text-sm font-medium">
                Language / Idioma
              </Label>
            </div>
            <RadioGroup
              id="language"
              value={language}
              onValueChange={(value) => setLanguage(value as any)}
              aria-label="Select language"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="lang-en" data-testid="radio-language-en" />
                <Label htmlFor="lang-en" className="text-sm cursor-pointer">
                  English
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="es" id="lang-es" data-testid="radio-language-es" />
                <Label htmlFor="lang-es" className="text-sm cursor-pointer">
                  Español (Spanish)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Settings are saved automatically and persist between sessions.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
