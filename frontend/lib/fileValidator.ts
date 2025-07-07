/**
 * File validation utilities for The Code Room
 * Validates both MIME type and file extension for security
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileType?: string;
}

// Supported file types with their MIME types and extensions
const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  
  // Code files
  'text/x-python': ['.py'],
  'application/x-python-code': ['.py'],
  'text/x-sql': ['.sql'],
  'application/sql': ['.sql'],
  'text/javascript': ['.js'],
  'application/javascript': ['.js'],
  'text/typescript': ['.ts'],
  'application/typescript': ['.ts'],
};

// Fallback extension-based validation for files where MIME detection fails
const EXTENSION_MAPPING: Record<string, string> = {
  '.pdf': 'PDF Document',
  '.docx': 'Word Document',
  '.txt': 'Text File',
  '.md': 'Markdown File',
  '.py': 'Python Script',
  '.sql': 'SQL Script',
  '.js': 'JavaScript File',
  '.ts': 'TypeScript File',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Validates a file based on type, extension, and size
 */
export const validateFile = (file: File): FileValidationResult => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 25MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  // Get file extension
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  // Check if extension is supported
  if (!Object.keys(EXTENSION_MAPPING).includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file type. Supported formats: pdf, docx, txt, md, py, sql, js, ts`,
    };
  }

  // Validate MIME type if available
  const mimeType = file.type;
  
  // If we have a MIME type, validate it against supported types
  if (mimeType) {
    const supportedMimes = Object.keys(SUPPORTED_FILE_TYPES);
    
    // If MIME type is supported, check if it matches the file extension
    if (supportedMimes.includes(mimeType)) {
      const validExtensionsForMime = SUPPORTED_FILE_TYPES[mimeType];
      if (!validExtensionsForMime.includes(extension)) {
        return {
          isValid: false,
          error: `File type mismatch. Expected ${validExtensionsForMime.join(' or ')} file but got ${extension}`,
        };
      }
    }
    // If MIME type is not in our supported list, we rely on extension validation above
    // Some browsers don't provide accurate MIME types for code files
  }

  return {
    isValid: true,
    fileType: EXTENSION_MAPPING[extension],
  };
};

/**
 * Validates multiple files at once
 */
export const validateFiles = (files: File[]): { validFiles: File[]; errors: string[] } => {
  const validFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const result = validateFile(file);
    if (result.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${result.error}`);
    }
  });

  return { validFiles, errors };
};

/**
 * Gets a human-readable description of supported file types
 */
export const getSupportedFileTypesDescription = (): string => {
  return 'pdf, docx, txt, md, py, sql, js, ts';
};

/**
 * Checks if a file extension is supported
 */
export const isSupportedExtension = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return Object.keys(EXTENSION_MAPPING).includes(extension);
}; 