import React, { useState, useEffect, useRef } from 'react';
import { Settings } from '@/types/chat';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { X, Check, Loader2 } from 'lucide-react';
import { validateApiKey } from '@/lib/api';
import { useTheme } from '../ThemeProvider';
import { useAppStore } from '@/lib/store/appStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
  message?: string;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  message = '',
}: SettingsModalProps) {
  const [formData, setFormData] = useState<Settings>(settings);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [dotCount, setDotCount] = useState(0);
  const { theme, setTheme } = useTheme();
  
  // App store for user name and RAG settings
  const { userName, ragEnabled, setUserName, setRagEnabled } = useAppStore();
  const [localUserName, setLocalUserName] = useState(userName);

  useEffect(() => {
    setFormData(settings);
    setLocalUserName(userName);
  }, [settings, userName]);

  // Validate API key when it changes
  useEffect(() => {
    if (!formData.apiKey) {
      setApiKeyStatus('idle');
      setApiKeyError('');
      return;
    }
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setApiKeyStatus('checking');
      setApiKeyError('');
      validateApiKey(formData.apiKey)
        .then(res => {
          if (res.valid) {
            setApiKeyStatus('valid');
            setApiKeyError('');
          } else {
            setApiKeyStatus('invalid');
            setApiKeyError(res.error || 'API key is invalid.');
          }
        })
        .catch(() => {
          setApiKeyStatus('invalid');
          setApiKeyError('Could not validate API key.');
        });
    }, 500);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [formData.apiKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (apiKeyStatus === 'checking') {
      interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 400);
    } else {
      setDotCount(0);
    }
    return () => clearInterval(interval);
  }, [apiKeyStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save settings
    onSave(formData);
    
    // Save user name to app store
    if (localUserName !== userName) {
      setUserName(localUserName);
    }
    
    onClose();
  };

  const handleChange = (field: keyof Settings, value: string | boolean) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
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

        {/* Optional message */}
        {message && (
          <div className="px-6 pt-4 pb-2 text-red-600 dark:text-red-400 font-medium">
            {message}
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={localUserName}
              onChange={(e) => setLocalUserName(e.target.value)}
              placeholder="Enter your name for the welcome message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoComplete="name"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This name will appear in your welcome message: &quot;Welcome to {localUserName}&apos;s Room&quot;
            </p>
          </div>

          {/* RAG Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                RAG Enabled
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use uploaded documentation to answer questions
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRagEnabled(!ragEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                ${ragEnabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              role="switch"
              aria-checked={ragEnabled}
              aria-label="Toggle RAG"
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${ragEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

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
              onClick={handleThemeToggle}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark theme"
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
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
          />

          {/* System Prompt */}
          <Textarea
            label="System Prompt"
            value={formData.systemPrompt}
            onChange={(e) => handleChange('systemPrompt', e.target.value)}
            placeholder="Enter the system prompt that defines the AI's behavior..."
            rows={4}
          />

          {/* API Key (required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ChatGPT API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.apiKey}
                onChange={e => handleChange('apiKey', e.target.value)}
                placeholder="Enter your OpenAI API key to use the chat..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                autoComplete="off"
                required
              />
              <span className="absolute right-3 top-2.5">
                {apiKeyStatus === 'checking' && <Loader2 className="animate-spin text-gray-400" size={18} />}
                {apiKeyStatus === 'valid' && <Check className="text-green-500" size={18} />}
                {apiKeyStatus === 'invalid' && <X className="text-red-500" size={18} />}
              </span>
            </div>
            {apiKeyError && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1">{apiKeyError}</p>
            )}
            {apiKeyStatus === 'checking' && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Validating{'.'.repeat(dotCount)}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={apiKeyStatus === 'invalid'}>
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 