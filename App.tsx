
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ChangeEvent, FC } from 'react';
// FIX: Imported the `LiveCallbacks` type to be used in the Live Conversation tab.
import { GoogleGenAI, LiveServerMessage, Chat, Blob as GenAiBlob, LiveSession, LiveCallbacks } from "@google/genai";
import * as geminiService from './services/geminiService';

// --- TYPE DEFINITIONS ---
enum Tab {
  IMAGE_GEN = 'Image Generation',
  IMAGE_EDIT = 'Image Editing',
  FACE_SWAP = 'Face Swap',
  VIDEO_GEN = 'Video Generation',
  MEDIA_ANALYSIS = 'Media Analysis',
  FAST_CHAT = 'Fast Chat',
  TTS = 'Speech Synthesis',
  LIVE_CHAT = 'Live Conversation',
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- SVG ICONS ---
// FIX: Changed type from `JSX.Element` to `React.ReactElement` to resolve JSX namespace error.
const Icons: Record<string, React.ReactElement> = {
  [Tab.IMAGE_GEN]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>,
  [Tab.IMAGE_EDIT]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>,
  [Tab.FACE_SWAP]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>,
  [Tab.VIDEO_GEN]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>,
  [Tab.MEDIA_ANALYSIS]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h7.5v7.5h-7.5v-7.5Z" /></svg>,
  [Tab.FAST_CHAT]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>,
  [Tab.TTS]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>,
  [Tab.LIVE_CHAT]: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 7.5v-1.5a6 6 0 0 0-6-6m-6 6v-1.5a6 6 0 0 1 6-6m0 6a6 6 0 0 0-6-6m6 6a6 6 0 0 1 6-6m-6 6v-1.5a6 6 0 0 0-6-6m0 0v-1.5a6 6 0 0 1 6-6v1.5m-6 0a6 6 0 0 0 6 6v-1.5m6 0a6 6 0 0 1-6 6v-1.5" /></svg>,
};


// --- HELPER & UI COMPONENTS ---

const Loader: FC = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
  </div>
);

interface TabButtonProps {
  label: Tab;
  isActive: boolean;
  onClick: () => void;
}
const TabButton: FC<TabButtonProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 w-full text-left ${
      isActive
        ? 'bg-cyan-500/20 text-cyan-400'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
    }`}
  >
    {Icons[label]}
    <span>{label}</span>
  </button>
);

const FileInput: FC<{
    onFileChange: (file: File) => void;
    onFilesChange?: (files: FileList) => void;
    accept: string;
    label?: string;
    multiple?: boolean;
    disabled?: boolean;
}> = ({ onFileChange, onFilesChange, accept, label = "Upload File", multiple = false, disabled = false }) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            if (multiple && onFilesChange) {
                onFilesChange(e.target.files);
            } else if (!multiple && e.target.files[0]) {
                onFileChange(e.target.files[0]);
            }
            e.target.value = ''; // Allow re-selecting the same file
        }
    };
    return (
        <label className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-center ${disabled ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer'}`}>
            {label}
            <input type="file" className="hidden" accept={accept} onChange={handleFileChange} multiple={multiple} disabled={disabled} />
        </label>
    );
};

// --- TAB COMPONENTS ---

const ImageGenerationTab: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<{ file: File; url: string }[]>([]);

    const handleFileChange = (files: FileList) => {
        const newImages = Array.from(files)
            .slice(0, 3 - referenceImages.length)
            .map(file => ({ file, url: URL.createObjectURL(file) }));
        setReferenceImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setLoading(true);
        setError(null);
        setImage(null);
        try {
            let imagePayloads;
            if (referenceImages.length > 0) {
                imagePayloads = await Promise.all(referenceImages.map(async (img) => {
                    const base64 = await geminiService.fileToBase64(img.file);
                    return { base64, mimeType: img.file.type };
                }));
            }
            const result = await geminiService.generateImage(prompt, aspectRatio, imagePayloads);
            setImage(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const hasReferenceImages = referenceImages.length > 0;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Generate Image with Imagen & Gemini</h2>
            <p className="text-gray-400 -mt-4">Generate from a text prompt, or provide up to 3 reference images to guide the AI.</p>
            
            <div className="p-4 bg-gray-700/50 rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Reference Images (Optional)</h3>
                <FileInput
                    onFileChange={() => {}} 
                    onFilesChange={handleFileChange}
                    accept="image/*"
                    label={referenceImages.length < 3 ? `Add Reference Image(s) (${referenceImages.length}/3)` : "Maximum 3 images uploaded"}
                    multiple
                    disabled={referenceImages.length >= 3}
                />
                {hasReferenceImages && (
                    <div className="grid grid-cols-3 gap-4">
                        {referenceImages.map((img, index) => (
                            <div key={index} className="relative group">
                                <img src={img.url} alt={`Reference ${index + 1}`} className="rounded-md w-full h-full object-cover aspect-square" />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Remove image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                 {hasReferenceImages && (
                    <button
                        onClick={() => setReferenceImages([])}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
                    >
                        Clear All Images
                    </button>
                )}
            </div>

            <textarea
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                rows={3}
                placeholder={hasReferenceImages ? "e.g., Make the cat wear a party hat" : "e.g., A photo of a raccoon wearing a cowboy hat, photorealistic."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
            />
            {!hasReferenceImages && (
                <div className="flex items-center space-x-4">
                    <label htmlFor="aspect-ratio" className="font-semibold">Aspect Ratio:</label>
                    <select
                        id="aspect-ratio"
                        className="p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                    >
                        {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                    </select>
                </div>
            )}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
            >
                {loading ? 'Generating...' : 'Generate'}
            </button>
            {error && <p className="text-red-400">{error}</p>}
            {loading && <Loader />}
            {image && (
                <div className="text-center space-y-4">
                    <img src={image} alt="Generated" className="rounded-lg mx-auto max-w-full" />
                    <a
                        href={image}
                        download="generated-image.jpg"
                        className="inline-block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                    >
                        Download Image
                    </a>
                </div>
            )}
        </div>
    );
};

const ImageEditingTab: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        setOriginalImage({ file, url: URL.createObjectURL(file) });
        setEditedImage(null);
    };

    const handleSubmit = async () => {
        if (!prompt || !originalImage) {
            setError('Please upload an image and enter a prompt.');
            return;
        }
        setLoading(true);
        setError(null);
        setEditedImage(null);
        try {
            const base64 = await geminiService.fileToBase64(originalImage.file);
            const result = await geminiService.editImage(prompt, base64, originalImage.file.type);
            setEditedImage(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Edit Image</h2>
            <FileInput onFileChange={handleFileChange} accept="image/*" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {originalImage && (
                    <div className="text-center">
                        <h3 className="font-semibold mb-2">Original</h3>
                        <img src={originalImage.url} alt="Original" className="rounded-lg mx-auto max-w-full" />
                    </div>
                )}
                {editedImage && (
                    <div className="text-center space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Edited</h3>
                            <img src={editedImage} alt="Edited" className="rounded-lg mx-auto max-w-full" />
                        </div>
                        <a
                          href={editedImage}
                          download="edited-image.png"
                          className="inline-block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                        >
                          Download Edited Image
                        </a>
                    </div>
                )}
            </div>
             {loading && <Loader />}
             {originalImage && (
                <>
                    <textarea
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        rows={3}
                        placeholder="e.g., Add a retro filter"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </>
            )}
            {error && <p className="text-red-400">{error}</p>}
        </div>
    );
};

const FaceSwapTab: FC = () => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [targetFaceImage, setTargetFaceImage] = useState<{ file: File; url: string } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOriginalFileChange = (file: File) => {
        setOriginalImage({ file, url: URL.createObjectURL(file) });
        setResultImage(null);
    };

    const handleTargetFileChange = (file: File) => {
        setTargetFaceImage({ file, url: URL.createObjectURL(file) });
        setResultImage(null);
    };

    const handleSubmit = async () => {
        if (!originalImage || !targetFaceImage) {
            setError('Please upload both an original image and a target face image.');
            return;
        }
        setLoading(true);
        setError(null);
        setResultImage(null);
        try {
            const originalBase64 = await geminiService.fileToBase64(originalImage.file);
            const targetBase64 = await geminiService.fileToBase64(targetFaceImage.file);
            
            const result = await geminiService.faceSwapImage(
                { base64: originalBase64, mimeType: originalImage.file.type },
                { base64: targetBase64, mimeType: targetFaceImage.file.type },
                prompt
            );
            setResultImage(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Face Swap</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileInput onFileChange={handleOriginalFileChange} accept="image/*" label="Upload Original Image" />
                <FileInput onFileChange={handleTargetFileChange} accept="image/*" label="Upload Target Face Image" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {originalImage && (
                    <div className="text-center">
                        <h3 className="font-semibold mb-2">Original</h3>
                        <img src={originalImage.url} alt="Original" className="rounded-lg mx-auto max-w-full" />
                    </div>
                )}
                {targetFaceImage && (
                    <div className="text-center">
                        <h3 className="font-semibold mb-2">Target Face</h3>
                        <img src={targetFaceImage.url} alt="Target Face" className="rounded-lg mx-auto max-w-full" />
                    </div>
                )}
                {resultImage && (
                    <div className="text-center space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Result</h3>
                            <img src={resultImage} alt="Result" className="rounded-lg mx-auto max-w-full" />
                        </div>
                        <a
                          href={resultImage}
                          download="face-swap-result.png"
                          className="inline-block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                        >
                          Download Result
                        </a>
                    </div>
                )}
            </div>
            {loading && <Loader />}
            {originalImage && targetFaceImage && (
                <>
                    <textarea
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        rows={2}
                        placeholder="Optional prompt (e.g., change hair color to red)"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
                    >
                        {loading ? 'Generating...' : 'Generate Face Swap'}
                    </button>
                </>
            )}
            {error && <p className="text-red-400">{error}</p>}
        </div>
    );
};


const VideoGenerationTab: FC = () => {
    type ApiKeyStatus = 'idle' | 'checking' | 'required' | 'selected' | 'error';
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [image, setImage] = useState<{ file: File; url: string } | null>(null);
    const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>('idle');
    
    useEffect(() => {
        const checkKey = async () => {
            setApiKeyStatus('checking');
            if (await (window as any).aistudio?.hasSelectedApiKey()) {
                setApiKeyStatus('selected');
            } else {
                setApiKeyStatus('required');
            }
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        await (window as any).aistudio?.openSelectKey();
        setApiKeyStatus('selected'); // Optimistic update
    };

    const handleSubmit = async () => {
        if (!prompt && !image) {
            setError('Please enter a prompt or upload an image.');
            return;
        }
        setLoading(true);
        setError(null);
        setVideoUrl(null);
        try {
            let imagePayload;
            if (image) {
                const base64 = await geminiService.fileToBase64(image.file);
                imagePayload = { base64, mimeType: image.file.type };
            }
            const result = await geminiService.generateVideo(prompt, aspectRatio, imagePayload);
            setVideoUrl(result);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            if (errorMessage.includes("Requested entity was not found")) {
                setApiKeyStatus('required');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const loadingMessages = [
        "Warming up the video engines...",
        "Composing the digital scenes...",
        "Rendering pixel by pixel...",
        "This can take a few minutes, hang tight!",
        "Almost there, adding the finishing touches...",
    ];
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    
    useEffect(() => {
      let interval: number;
      if (loading) {
        interval = window.setInterval(() => {
          setLoadingMessage(prev => {
            const currentIndex = loadingMessages.indexOf(prev);
            return loadingMessages[(currentIndex + 1) % loadingMessages.length];
          });
        }, 4000);
      }
      return () => clearInterval(interval);
    }, [loading]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Generate Video with Veo</h2>
            
            {apiKeyStatus === 'required' && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-4 rounded-lg space-y-3">
                    <p>Veo video generation requires an API key. Please select one to continue.</p>
                    <p>For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">billing documentation</a>.</p>
                    <button onClick={handleSelectKey} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg">Select API Key</button>
                </div>
            )}

            {apiKeyStatus === 'selected' && (
                <>
                    <FileInput onFileChange={(file) => setImage({file, url: URL.createObjectURL(file)})} accept="image/*" />
                    {image && <img src={image.url} alt="Starting frame" className="rounded-lg mx-auto max-w-xs" />}
                    <textarea
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        rows={3}
                        placeholder="e.g., An astronaut riding a horse on Mars, cinematic."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <div className="flex items-center space-x-4">
                        <label htmlFor="video-aspect-ratio" className="font-semibold">Aspect Ratio:</label>
                        <select
                            id="video-aspect-ratio"
                            className="p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
                        >
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </>
            )}

            {error && <p className="text-red-400">{error}</p>}
            {loading && (
                <div className="text-center space-y-4">
                    <Loader />
                    <p className="text-lg font-medium text-cyan-300">{loadingMessage}</p>
                </div>
            )}
            {videoUrl && (
                <div className="text-center space-y-4">
                    <video src={videoUrl} controls className="rounded-lg mx-auto max-w-full" />
                    <a
                        href={videoUrl}
                        download="generated-video.mp4"
                        className="inline-block w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                    >
                        Download Video
                    </a>
                </div>
            )}
        </div>
    );
};

const MediaAnalysisTab: FC = () => {
    const [prompt, setPrompt] = useState('');
    const [media, setMedia] = useState<{ file: File; url: string } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (file: File) => {
        setMedia({ file, url: URL.createObjectURL(file) });
        setResult(null);
    };

    const handleDownloadAnalysis = () => {
        if (!result) return;
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleSubmit = async () => {
        if (!prompt || !media) {
            setError('Please upload media and enter a prompt.');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const base64 = await geminiService.fileToBase64(media.file);
            const analysis = await geminiService.analyzeMedia(prompt, base64, media.file.type);
            setResult(analysis);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Analyze Image or Video</h2>
            <FileInput onFileChange={handleFileChange} accept="image/*,video/*" />
            {media && (
                <div className="text-center">
                    {media.file.type.startsWith('image/') ? (
                        <img src={media.url} alt="Uploaded" className="rounded-lg mx-auto max-w-full" />
                    ) : (
                        <video src={media.url} controls className="rounded-lg mx-auto max-w-full" />
                    )}
                </div>
            )}
            {media && (
                <>
                    <textarea
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                        rows={3}
                        placeholder="e.g., What is in this image?"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
                    >
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>
                </>
            )}
            {error && <p className="text-red-400">{error}</p>}
            {loading && <Loader />}
            {result && (
                <div className="p-4 bg-gray-800 rounded-lg space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2 text-lg text-cyan-400">Analysis Result</h3>
                        <p className="whitespace-pre-wrap">{result}</p>
                    </div>
                    <button
                        onClick={handleDownloadAnalysis}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                    >
                        Download Analysis
                    </button>
                </div>
            )}
        </div>
    );
};

const FastChatTab: FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);

    useEffect(() => {
        chatRef.current = geminiService.createFastChat();
    }, []);
    
    const handleDownloadChat = () => {
        if (messages.length === 0) return;
        const chatHistory = messages
            .map(msg => `${msg.role === 'user' ? 'You' : 'Model'}: ${msg.text}`)
            .join('\n\n');
        const blob = new Blob([chatHistory], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat-history.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSend = async () => {
        if (!input.trim() || !chatRef.current) return;
        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: input });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (e) {
            const errorMessage: ChatMessage = { role: 'model', text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-cyan-400">Fast Chat with Gemini Flash Lite</h2>
                {messages.length > 0 && (
                    <button
                        onClick={handleDownloadChat}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm"
                    >
                        Download Chat
                    </button>
                )}
            </div>
            <div className="flex-grow overflow-y-auto p-4 bg-gray-800 rounded-lg space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-700' : 'bg-gray-600'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {loading && <div className="flex justify-start"><div className="bg-gray-600 p-3 rounded-lg">...</div></div>}
            </div>
            <div className="mt-4 flex space-x-2">
                <input
                    type="text"
                    className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Type your message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                    disabled={loading}
                />
                <button onClick={handleSend} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-3 rounded-lg transition-all duration-200 disabled:bg-gray-500">Send</button>
            </div>
        </div>
    );
};

const TtsTab: FC = () => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioData, setAudioData] = useState<Uint8Array | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const handleDownloadAudio = () => {
        if (!audioData) return;
        const wavBlob = geminiService.pcmToWav(audioData, 24000, 1);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'speech.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleSpeak = async () => {
        if (!text) {
            setError('Please enter some text.');
            return;
        }
        setLoading(true);
        setError(null);
        setAudioData(null);
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioContext = audioContextRef.current;
            
            const base64Audio = await geminiService.generateSpeech(text);
            const decodedBytes = geminiService.decode(base64Audio);
            setAudioData(decodedBytes);
            const audioBuffer = await geminiService.decodeAudioData(decodedBytes, audioContext, 24000, 1);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-cyan-400">Text-to-Speech</h2>
            <textarea
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                rows={5}
                placeholder="Type text to be spoken..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button
                onClick={handleSpeak}
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-500"
            >
                {loading ? 'Generating...' : 'Speak'}
            </button>
            {error && <p className="text-red-400">{error}</p>}
            {audioData && !loading && (
                 <button
                    onClick={handleDownloadAudio}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
                >
                    Download Audio (.wav)
                </button>
            )}
        </div>
    );
};

const LiveChatTab: FC = () => {
  type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transcripts, setTranscripts] = useState<{user: string, model: string}[]>([]);
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContexts = useRef<{input: AudioContext | null, output: AudioContext | null, inputProcessor: ScriptProcessorNode | null}>({input: null, output: null, inputProcessor: null});
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);

  const handleDownloadTranscript = () => {
    if (transcripts.length === 0) return;
    const history = transcripts
        .map(t => `You: ${t.user}\n\nModel: ${t.model}`)
        .join('\n\n---\n\n');
    const blob = new Blob([history], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'live-transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startConversation = async () => {
    setConnectionState('connecting');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContexts.current.input = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContexts.current.output = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const callbacks: LiveCallbacks = {
        onopen: () => {
          setConnectionState('connected');
          const source = audioContexts.current.input!.createMediaStreamSource(streamRef.current!);
          const scriptProcessor = audioContexts.current.input!.createScriptProcessor(4096, 1, 1);
          audioContexts.current.inputProcessor = scriptProcessor;
          
          scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
            const pcmBlob: GenAiBlob = { data: geminiService.encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
            
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContexts.current.input!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
           if (message.serverContent?.outputTranscription) {
             currentOutputRef.current += message.serverContent.outputTranscription.text;
           }
           if (message.serverContent?.inputTranscription) {
             currentInputRef.current += message.serverContent.inputTranscription.text;
           }
           if (message.serverContent?.turnComplete) {
             const fullInput = currentInputRef.current;
             const fullOutput = currentOutputRef.current;
             setTranscripts(prev => [...prev, {user: fullInput, model: fullOutput}]);
             currentInputRef.current = '';
             currentOutputRef.current = '';
           }
           const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
           if (audioData && audioContexts.current.output) {
              const outputCtx = audioContexts.current.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await geminiService.decodeAudioData(geminiService.decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
           }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Live API Error:', e);
          setConnectionState('error');
          stopConversation();
        },
        onclose: () => {
          stopConversation();
        },
      };
      sessionPromiseRef.current = geminiService.startLiveSession(callbacks);
    } catch (e) {
      console.error('Failed to start session:', e);
      setConnectionState('error');
    }
  };

  const stopConversation = useCallback(() => {
    sessionPromiseRef.current?.then(s => s.close());
    sessionPromiseRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    audioContexts.current.inputProcessor?.disconnect();
    audioContexts.current.inputProcessor = null;
    audioContexts.current.input?.close();
    audioContexts.current.output?.close();
    audioContexts.current = {input: null, output: null, inputProcessor: null};
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setConnectionState('disconnected');
  }, []);

  useEffect(() => {
    return () => { stopConversation() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
      <div className="flex flex-col h-[80vh]">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-cyan-400">Live Conversation</h2>
              {transcripts.length > 0 && (
                  <button
                      onClick={handleDownloadTranscript}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm"
                  >
                      Download Transcript
                  </button>
              )}
          </div>
          <div className="flex justify-center mb-4">
              <button
                  onClick={connectionState === 'connected' ? stopConversation : startConversation}
                  disabled={connectionState === 'connecting'}
                  className={`px-6 py-3 font-bold rounded-full transition-all duration-300 text-white flex items-center space-x-2
                      ${connectionState === 'connected' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}
                      ${connectionState === 'connecting' && 'bg-gray-500'}`}
              >
                  {connectionState === 'connected' && <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>}
                  <span>
                      {connectionState === 'connected' ? 'Stop Conversation' :
                       connectionState === 'connecting' ? 'Connecting...' : 'Start Conversation'}
                  </span>
              </button>
          </div>
          {connectionState === 'error' && <p className="text-red-400 text-center">Connection error. Please try again.</p>}
          <div className="flex-grow overflow-y-auto p-4 bg-gray-800 rounded-lg space-y-4">
            {transcripts.map((t, i) => (
                <div key={i} className="space-y-2">
                    <p><strong className="text-cyan-400">You:</strong> {t.user}</p>
                    <p><strong className="text-purple-400">Model:</strong> {t.model}</p>
                </div>
            ))}
          </div>
      </div>
  );
};


// --- MAIN APP COMPONENT ---

const App: FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.IMAGE_GEN);

    const TABS: { id: Tab, component: FC }[] = [
        { id: Tab.IMAGE_GEN, component: ImageGenerationTab },
        { id: Tab.IMAGE_EDIT, component: ImageEditingTab },
        { id: Tab.FACE_SWAP, component: FaceSwapTab },
        { id: Tab.VIDEO_GEN, component: VideoGenerationTab },
        { id: Tab.MEDIA_ANALYSIS, component: MediaAnalysisTab },
        { id: Tab.FAST_CHAT, component: FastChatTab },
        { id: Tab.TTS, component: TtsTab },
        { id: Tab.LIVE_CHAT, component: LiveChatTab },
    ];

    const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || (() => <div>Not Found</div>);
    
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <div className="container mx-auto p-4 md:p-8">
                <header className="text-center mb-8 md:mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                            Gemini Multi-Modal Studio
                        </span>
                    </h1>
                    <p className="mt-2 text-lg text-gray-400">Your all-in-one AI creative suite.</p>
                </header>

                <div className="flex flex-col md:flex-row gap-8">
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <nav className="space-y-2">
                            {TABS.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    label={tab.id}
                                    isActive={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </nav>
                    </aside>

                    <main className="flex-grow bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 min-h-[60vh]">
                       <ActiveComponent />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;