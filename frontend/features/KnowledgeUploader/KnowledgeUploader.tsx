'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Code, FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFiles, getSupportedFileTypesDescription } from '@/lib/fileValidator';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  message?: string;
  chunks?: number;
}

interface KnowledgeUploaderProps {
  className?: string;
  onUploadComplete?: (filename: string, result: any) => void;
  onUploadError?: (filename: string, error: string) => void;
  apiEndpoint?: string;
}

/**
 * Enhanced KnowledgeUploader for The Code Room
 * Supports multiple file types including code files and documents
 */
export function KnowledgeUploader({ 
  className,
  onUploadComplete,
  onUploadError,
  apiEndpoint = '/api/v1/knowledge/upload'
}: KnowledgeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'py':
      case 'js':
      case 'ts':
      case 'sql':
        return <Code className="h-5 w-5 text-blue-500 flex-shrink-0" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />;
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />;
      case 'md':
        return <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />;
      case 'txt':
        return <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />;
      default:
        return <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // For now, we'll use a simple alert. In a real app, you'd use a proper toast library
    if (type === 'error') {
      console.error(message);
      // You could integrate with a toast library here
    } else {
      console.log(message);
      // You could integrate with a toast library here
    }
  };

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate files
    const { validFiles, errors } = validateFiles(fileArray);
    
    // Show errors for invalid files
    errors.forEach(error => {
      showToast(error, 'error');
      if (onUploadError) {
        onUploadError('validation', error);
      }
    });

    if (validFiles.length === 0) {
      showToast('No valid files to upload', 'error');
      return;
    }

    // Add valid files to uploaded files list with uploading status
    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      status: 'uploading' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Upload each valid file
    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const chunks = result.result?.chunks_created || 0;
          
          // Update file status to success
          setUploadedFiles(prev => prev.map(uf => 
            uf.file === file 
              ? { 
                  ...uf, 
                  status: 'success' as const, 
                  message: `Processed successfully`,
                  chunks
                }
              : uf
          ));

          // Show success toast
          showToast(`Indexed ${file.name} (${chunks} chunks)`, 'success');

          // Call success callback
          if (onUploadComplete) {
            onUploadComplete(file.name, result);
          }
        } else {
          const error = await response.json();
          throw new Error(error.detail || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        // Update file status to error
        setUploadedFiles(prev => prev.map(uf => 
          uf.file === file 
            ? { ...uf, status: 'error' as const, message: errorMessage }
            : uf
        ));

        // Show error toast
        showToast(`Failed to upload ${file.name}: ${errorMessage}`, 'error');

        // Call error callback
        if (onUploadError) {
          onUploadError(file.name, errorMessage);
        }
      }
    }
  }, [apiEndpoint, onUploadComplete, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFileUpload]);

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(uf => uf.file !== fileToRemove));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const supportedTypes = getSupportedFileTypesDescription();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragOver 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.py,.sql,.js,.ts"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <Upload className="mx-auto mb-4 h-8 w-8 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Add new knowledge for me
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop code or doc files here, or click to browse ({supportedTypes})
        </p>
        <Button variant="outline" type="button">
          Choose Files
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Max file size: 25MB • Supported: {supportedTypes}
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Uploaded Files ({uploadedFiles.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={`${uploadedFile.file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {getFileIcon(uploadedFile.file.name)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    {uploadedFile.chunks && ` • ${uploadedFile.chunks} chunks`}
                    {uploadedFile.message && ` • ${uploadedFile.message}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                  )}
                  {uploadedFile.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {uploadedFile.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.file)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 