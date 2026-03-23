import React from 'react';
import { Sparkles, Zap } from 'lucide-react';

export const AppHeader: React.FC = () => {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="bg-primary/20 p-2 rounded-lg">
          <Zap className="text-primary w-6 h-6" />
        </div>
        <h1 className="text-xl font-headline tracking-tight">VisionForge</h1>
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>Digital Image Processing</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span>LLM Understanding</span>
        </div>
      </div>
    </header>
  );
};
