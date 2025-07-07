import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster, toast } from 'react-hot-toast';

// Allowed extensions for developer knowledge files
const ALLOWED_EXTENSIONS = [
  '.pdf', '.txt', '.md', '.py', '.js', '.ts', '.tsx', '.json', '.csv', '.sql', '.html', '.css', '.yaml', '.yml', '.java'
];

interface UploadedFile {
  file: File;
  status: 'uploading' | 'success' | 'error' | 'duplicate';
  message?: string;
}

interface KnowledgeFile {
  filename: string;
  content_type: string;
  total_chunks: number;
  file_hash: string;
  chunk_count: number;
}

interface KnowledgeManagerProps {
  className?: string;
  onUploadComplete?: (filename: string, result: unknown) => void;
  apiEndpoint?: string;
}

export function KnowledgeManager({ 
  className,
  onUploadComplete,
  apiEndpoint = '/api/v1/knowledge'
}: KnowledgeManagerProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<{
    file: File;
    filename: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing files on mount
  useEffect(() => {
    loadKnowledgeFiles();
  }, [loadKnowledgeFiles]);

  const loadKnowledgeFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiEndpoint}/files`);
      if (response.ok) {
        const data = await response.json();
        setKnowledgeFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error loading knowledge files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint]);

  const actuallyDeleteFile = async (filename: string) => {
    try {
      const response = await fetch(`${apiEndpoint}/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Deleted "${filename}" (${result.chunks_deleted} chunks)`);
        await loadKnowledgeFiles();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Error deleting file. Please try again.');
    }
  };

  const handleDeleteClick = (filename: string) => {
    setFileToDelete(filename);
  };

  const overwriteFile = async (filename: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiEndpoint}/files/${encodeURIComponent(filename)}/overwrite`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update upload status
        setUploadedFiles(prev => prev.map(uf => 
          uf.file === file 
            ? { ...uf, status: 'success' as const, message: `Overwritten with ${result.result?.chunks_created || 0} chunks` }
            : uf
        ));

        // Refresh knowledge files list
        await loadKnowledgeFiles();

        if (onUploadComplete) {
          onUploadComplete(filename, result);
        }

        toast.success(`Overwrote "${filename}" with ${result.new_chunks} chunks`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to overwrite');
      }
    } catch (error) {
      console.error('Overwrite error:', error);
      
      setUploadedFiles(prev => prev.map(uf => 
        uf.file === file 
          ? { ...uf, status: 'error' as const, message: error instanceof Error ? error.message : 'Overwrite failed' }
          : uf
      ));

      toast.error('Error overwriting file. Please try again.');
    }
  };

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });

    if (validFiles.length === 0) {
      toast.error(`No supported files found. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    // Add files to uploaded files list with uploading status
    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      status: 'uploading' as const
    }));
    
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${apiEndpoint}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.exists) {
            // File already exists - show duplicate dialog
            setUploadedFiles(prev => prev.map(uf => 
              uf.file === file 
                ? { ...uf, status: 'duplicate' as const, message: result.message }
                : uf
            ));
            
            setShowDuplicateDialog({
              file,
              filename: file.name
            });
          } else {
            // Upload successful
            setUploadedFiles(prev => prev.map(uf => 
              uf.file === file 
                ? { ...uf, status: 'success' as const, message: `Processed ${result.result?.chunks_created || 0} chunks` }
                : uf
            ));

            // Refresh knowledge files list
            await loadKnowledgeFiles();

            if (onUploadComplete) {
              onUploadComplete(file.name, result);
            }
          }
        } else {
          const error = await response.json();
          throw new Error(error.detail || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        
        setUploadedFiles(prev => prev.map(uf => 
          uf.file === file 
            ? { ...uf, status: 'error' as const, message: error instanceof Error ? error.message : 'Upload failed' }
            : uf
        ));
      }
    }
  }, [apiEndpoint, loadKnowledgeFiles, onUploadComplete]);

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
    e.target.value = '';
  }, [handleFileUpload]);

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(uf => uf.file !== fileToRemove));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const handleOverwrite = async () => {
    if (showDuplicateDialog) {
      await overwriteFile(showDuplicateDialog.filename, showDuplicateDialog.file);
      setShowDuplicateDialog(null);
    }
  };

  const handleSkipDuplicate = () => {
    if (showDuplicateDialog) {
      // Remove the duplicate file from upload list
      setUploadedFiles(prev => prev.filter(uf => uf.file !== showDuplicateDialog.file));
      setShowDuplicateDialog(null);
    }
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
          accept=".pdf,.txt,.md,.py,.js,.ts,.tsx,.json,.csv,.sql,.html,.css,.yaml,.yml,.java"
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
          Supported: PDF, TXT, MD, PY, JS, TS, JSON, CSV, SQL, HTML, CSS, YAML, JAVA
        </p>
      </div>

      {/* Knowledge Base Files */}
      {knowledgeFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Knowledge Base ({knowledgeFiles.length} files)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadKnowledgeFiles}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {knowledgeFiles.map((file, index) => (
              <div
                key={`${file.filename}-${index}`}
                className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {file.chunk_count} chunks • {file.content_type}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(file.filename)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently Uploading Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Upload Queue ({uploadedFiles.length})
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
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
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
                  {uploadedFile.status === 'duplicate' && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
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

      {/* Duplicate File Dialog */}
      {showDuplicateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              File Already Exists
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              A file named &quot;{showDuplicateDialog.filename}&quot; already exists in your knowledge base. 
              Would you like to overwrite it with the new file?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleSkipDuplicate}
              >
                Skip
              </Button>
              <Button
                variant="default"
                onClick={handleOverwrite}
              >
                Overwrite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{fileToDelete}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setFileToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700"
                onClick={() => {
                  actuallyDeleteFile(fileToDelete);
                  setFileToDelete(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      <Toaster position="bottom-left" />
    </div>
  );
} 