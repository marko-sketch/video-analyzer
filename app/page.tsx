'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './page.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: Date;
}

interface UploadedImage {
  base64: string;
  name: string;
  preview: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  role: 'assistant',
  content: `Zdravo! 👋 Ja sam tvoj AI asistent za dijagnostiku YouTube videa.

Vodiću te kroz **5 koraka** analize koristeći Advanced Mode u YouTube Studio:

1. **Setup** → Osnovne info o videu
2. **Reach** → Baseline metrike
3. **Traffic Sources** → Odakle dolaze gledaloci
4. **Retention** → Kako različiti segmenti gledaju
5. **Finalni Report** → Dijagnoza + Akcioni plan

---

**Hajde da počnemo!** Reci mi:

1. 📹 **Naziv videa:**
2. ⏱️ **Dužina videa:** (mm:ss)
3. 📅 **Period analize:** (Since published ili datumi)
4. 🎯 **Niša kanala:** (1 rečenica - ko gleda)

---
➡️ **Sledeći korak:** Unesi osnovne informacije`,
  timestamp: new Date(),
};

// Convert file to base64 data URL
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Check if message contains final report
const isFinalReport = (content: string): boolean => {
  return content.includes('FINALNI REPORT') || 
         content.includes('SAŽETAK') && content.includes('DIJAGNOZA') && content.includes('AKCIONI PLAN');
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Find the last report message
  const getLastReport = (): Message | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && isFinalReport(messages[i].content)) {
        return messages[i];
      }
    }
    return null;
  };

  // Generate PDF from report
  const downloadPdf = async () => {
    const report = getLastReport();
    if (!report) {
      setError('Nema finalnog reporta za download. Završi analizu prvo.');
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: report.content,
          title: 'YouTube Video Dijagnostika',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Greška pri generisanju PDF-a. Pokušaj ponovo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle file upload - convert to base64
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setError(null);
      const newImages: UploadedImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`Invalid file type: ${file.type}. Please upload images only.`);
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          setError('File too large. Maximum size: 10MB');
          return;
        }

        const base64 = await fileToBase64(file);
        newImages.push({
          base64,
          name: file.name,
          preview: base64,
        });
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setError('Failed to process images');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && uploadedImages.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      images: uploadedImages.map((img) => img.preview),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const imagesToSend = [...uploadedImages];
    setUploadedImages([]);
    setIsLoading(true);
    setError(null);

    try {
      const sessionMessages = messages
        .filter((m) => m.id !== 'initial')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionMessages,
          userText: userMessage.content,
          images: imagesToSend.map((img) => img.base64),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    setInputText('');
    setUploadedImages([]);
    setError(null);
  };

  const formatContent = (content: string) => {
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/---/g, '<hr class="' + styles.divider + '"/>');
    // Format tables
    formatted = formatted.replace(/\|(.+)\|/g, '<span class="' + styles.tableRow + '">|$1|</span>');
    return formatted;
  };

  const hasReport = getLastReport() !== null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📊</span>
            <div>
              <h1 className={styles.logoText}>Video Analyzer</h1>
              <p className={styles.logoSubtext}>YouTube Video Dijagnostika</p>
            </div>
          </div>
          <div className={styles.headerButtons}>
            {hasReport && (
              <button 
                className={`btn btn-secondary ${styles.pdfBtn}`} 
                onClick={downloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <div className={styles.spinnerSmall} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {isGeneratingPdf ? 'Generiše...' : 'Download PDF'}
              </button>
            )}
            <button className={`btn btn-ghost ${styles.resetBtn}`} onClick={resetConversation}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Nova analiza
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${styles[message.role]} ${
                message.role === 'assistant' && isFinalReport(message.content) ? styles.reportMessage : ''
              } animate-slide-up`}
            >
              <div className={styles.messageAvatar}>
                {message.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className={styles.messageContent}>
                {message.role === 'assistant' && isFinalReport(message.content) && (
                  <div className={styles.reportBadge}>📋 Finalni Report</div>
                )}
                <div
                  className={styles.messageText}
                  dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                />
                {message.images && message.images.length > 0 && (
                  <div className={styles.messageImages}>
                    {message.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Uploaded ${idx + 1}`}
                        className={styles.messageImage}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={`${styles.message} ${styles.assistant} animate-slide-up`}>
              <div className={styles.messageAvatar}>🤖</div>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inputContainer}>
          {error && (
            <div className={styles.errorMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
              <button onClick={() => setError(null)} className={styles.errorClose}>×</button>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className={styles.uploadedImages}>
              {uploadedImages.map((img, idx) => (
                <div key={idx} className={styles.uploadedImageItem}>
                  <img src={img.preview} alt={img.name} />
                  <button
                    className={styles.removeImageBtn}
                    onClick={() => removeImage(idx)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className={styles.dropOverlay}>
                <span>📷 Spusti slike ovde</span>
              </div>
            )}

            <button
              className={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className={styles.fileInput}
            />

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Unesi informacije o videu ili postavi pitanje..."
              className={styles.textarea}
              rows={1}
              disabled={isLoading}
            />

            <button
              className={`btn btn-primary ${styles.sendBtn}`}
              onClick={sendMessage}
              disabled={isLoading || (!inputText.trim() && uploadedImages.length === 0)}
              aria-label="Send message"
            >
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>

          <p className={styles.disclaimer}>
            AI analiza je pomoćni alat. Uvek koristi sopstvenu procenu za finalne odluke.
          </p>
        </div>
      </footer>
    </div>
  );
}
