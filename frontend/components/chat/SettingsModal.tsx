import React, { useState, useEffect } from 'react';
import { Settings } from '@/types/chat';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
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

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof Settings, value: string | boolean) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    // Immediately save theme changes without closing the modal
    if (field === 'darkTheme') {
      onSave(newFormData);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="settings-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            Settings
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close settings"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dark Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dark Theme
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Switch between light and dark appearance
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('darkTheme', !formData.darkTheme)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                ${formData.darkTheme ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              role="switch"
              aria-checked={formData.darkTheme}
              aria-label="Toggle dark theme"
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${formData.darkTheme ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save & Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 