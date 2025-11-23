import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface ParsedClaimItem {
  category: string;
  description: string;
  quantity: number;
  quotedPrice: number;
  confidence: 'high' | 'medium' | 'low';
}

interface DocumentUploadProps {
  onItemsExtracted: (items: ParsedClaimItem[]) => void;
}

export function DocumentUpload({ onItemsExtracted }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadStatus('idle');
    setStatusMessage('Processing document with OCR...');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch('/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const data = await response.json();

      if (data.parsedItems && data.parsedItems.length > 0) {
        setUploadStatus('success');
        setStatusMessage(`Successfully extracted ${data.parsedItems.length} item(s) from document!`);
        onItemsExtracted(data.parsedItems);
        
        toast({
          title: 'Document processed',
          description: `Found ${data.parsedItems.length} claim item(s) in your document.`,
        });
      } else {
        setUploadStatus('error');
        setStatusMessage('No claim items found in document. Please add items manually.');
        
        toast({
          title: 'No items found',
          description: 'Could not extract claim items. Please enter them manually.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('OCR error:', error);
      setUploadStatus('error');
      setStatusMessage('Failed to process document. Please try again or enter items manually.');
      
      toast({
        title: 'Processing failed',
        description: 'Could not process the document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Upload Insurance Document (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Upload your insurance claim letter or estimate to automatically extract items and costs
        </p>
      </div>

      <Card
        data-testid="upload-dropzone"
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover-elevate'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" data-testid="icon-processing" />
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
              </>
            ) : uploadStatus === 'success' ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-600" data-testid="icon-success" />
                <p className="text-sm font-medium text-green-600">{statusMessage}</p>
              </>
            ) : uploadStatus === 'error' ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" data-testid="icon-error" />
                <p className="text-sm text-destructive">{statusMessage}</p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" data-testid="icon-upload" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    Drag and drop your document here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or
                  </p>
                </div>
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="button-select-file"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Select File
                  </Button>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-file"
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, PDF (max 10MB)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {uploadStatus !== 'idle' && (
        <Alert data-testid="alert-status">
          <AlertDescription className="text-sm">
            {uploadStatus === 'success'
              ? 'Items have been added to your claim. You can review, edit, or add more items below.'
              : 'No problem! You can manually enter your claim items using the form below.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
