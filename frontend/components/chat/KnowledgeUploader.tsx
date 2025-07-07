import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

interface KnowledgeUploaderProps {
  className?: string;
  onUploadComplete?: (filename: string, result: any) => void;
  apiEndpoint?: string;
}

export function KnowledgeUploader({ 
  className,
  onUploadComplete,
  apiEndpoint = '/api/v1/knowledge/upload'
}: KnowledgeUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const pdfFiles = fileArray.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      alert('Please select PDF files only.');
      return;
    }

    // Add files to uploaded files list with uploading status
    const newUploadedFiles: UploadedFile[] = pdfFiles.map(file => ({
      file,
      status: 'uploading' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Upload each file
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update file status to success
          setUploadedFiles(prev => prev.map(uf => 
            uf.file === file 
              ? { ...uf, status: 'success' as const, message: `Processed ${result.result?.chunks_created || 0} chunks` }
              : uf
          ));

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
        
        // Update file status to error
        setUploadedFiles(prev => prev.map(uf => 
          uf.file === file 
            ? { ...uf, status: 'error' as const, message: error instanceof Error ? error.message : 'Upload failed' }
            : uf
        ));
      }
    }
  }, [apiEndpoint, onUploadComplete]);

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
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <Upload className="mx-auto mb-4 h-8 w-8 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Add new knowledge for me
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Drag and drop PDF files here, or click to browse
        </p>
        <Button variant="outline" type="button">
          Choose Files
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Only PDF files are supported
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
                <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    {uploadedFile.message && ` • ${uploadedFile.message}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
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