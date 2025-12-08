import { Settings, Type, Contrast, Languages, Zap, Keyboard, ALargeSmall } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function AccessibilitySettings() {
  const { 
    textSize, 
    setTextSize,
    fontStyle,
    setFontStyle,
    highContrast, 
    setHighContrast, 
    reduceMotion,
    setReduceMotion,
    language, 
    setLanguage 
  } = useAccessibility();

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

          {/* Font Style */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ALargeSmall className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Label htmlFor="font-style" className="text-sm font-medium">
                Font Style
              </Label>
            </div>
            <RadioGroup
              id="font-style"
              value={fontStyle}
              onValueChange={(value) => setFontStyle(value as any)}
              aria-label="Select font style"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sans-serif" id="font-sans" data-testid="radio-font-sans-serif" />
                <Label htmlFor="font-sans" className="text-sm cursor-pointer">
                  Sans-serif (Default)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="serif" id="font-serif" data-testid="radio-font-serif" />
                <Label htmlFor="font-serif" className="text-sm cursor-pointer" style={{ fontFamily: 'Georgia, serif' }}>
                  Serif
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dyslexia-friendly" id="font-dyslexia" data-testid="radio-font-dyslexia" />
                <Label htmlFor="font-dyslexia" className="text-sm cursor-pointer">
                  Dyslexia-Friendly
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

          {/* Reduce Motion */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Label htmlFor="reduce-motion" className="text-sm font-medium cursor-pointer">
                Reduce Motion
              </Label>
            </div>
            <Switch
              id="reduce-motion"
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
              data-testid="switch-reduce-motion"
              aria-label="Toggle reduce motion for animations"
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Minimizes animations and transitions
          </p>

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

          {/* Keyboard Shortcuts */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium hover:text-foreground transition-colors">
              <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Keyboard Shortcuts</span>
              <span className="ml-auto text-xs text-muted-foreground">Click to expand</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd>
                  <span>Next element</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift+Tab</kbd>
                  <span>Previous</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd>
                  <span>Activate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd>
                  <span>Toggle</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
                  <span>Close modal</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Arrow</kbd>
                  <span>Navigate</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
