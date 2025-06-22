import React, { useState } from 'react';
import { Settings, AVAILABLE_MODELS } from '@/types/chat';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<Settings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof Settings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const modelOptions = AVAILABLE_MODELS.map(model => ({
    value: model,
    label: model,
  }));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2
            id="settings-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            Settings
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Model Selection */}
          <Select
            label="Model"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            options={modelOptions}
            required
          />

          {/* Developer Prompt */}
          <Textarea
            label="Developer Prompt"
            value={formData.developerPrompt}
            onChange={(e) => handleChange('developerPrompt', e.target.value)}
            placeholder="Enter the developer prompt that will be used for all conversations..."
            rows={4}
            required
          />

          {/* System Prompt */}
          <Textarea
            label="System Prompt"
            value={formData.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            placeholder="Enter the system prompt that defines the AI's behavior..."
            rows={4}
            required
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 