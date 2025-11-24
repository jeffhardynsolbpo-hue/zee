

import { GoogleGenAI, Modality, Type, Chat, GenerateContentResponse, LiveCallbacks, GenerateContentStreamResponse, Operation } from "@google/genai";

// --- Media Helper Functions ---

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const encode = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const pcmToWav = (pcmData: Uint8Array, sampleRate: number, numChannels: number): Blob => {
    const dataLength = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    const bitDepth = 16;
    const blockAlign = (numChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = dataLength;
    const fileSize = 36 + dataSize;

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(8, 'WAVE');

    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    for (let i = 0; i < dataLength; i++) {
        view.setUint8(44 + i, pcmData[i]);
    }

    return new Blob([view], { type: 'audio/wav' });
};


// --- API Service ---

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImage = async (
    prompt: string,
    aspectRatio: string,
    referenceImages?: { base64: string; mimeType: string }[]
): Promise<string> => {
    const ai = getAi();

    if (referenceImages && referenceImages.length > 0) {
        // Use Gemini Flash Image for generation with references
        const parts: any[] = [{ text: prompt }];
        for (const image of referenceImages) {
            parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image generated from reference images.");

    } else {
        // Use Imagen for text-to-image generation
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    throw new Error("No image generated.");
};

export const faceSwapImage = async (
    originalImage: { base64: string; mimeType: string },
    targetFaceImage: { base64: string; mimeType: string },
    prompt: string
): Promise<string> => {
    const ai = getAi();
    const systemPrompt = `**Task: Photorealistic Face Swap**

**Objective:**
Replace the face of the person in **Image 1 (Base Image)** with the face of the person from **Image 2 (Face Source)**.

**Input Images:**
- **Image 1 (Base Image):** This is the main photo. The body, pose, background, and expression from this image should be preserved.
- **Image 2 (Face Source):** This image provides the face to be swapped onto Image 1.

**Critical Instructions for a high-quality result:**

1.  **Identity Preservation:** The resulting face must clearly be the person from **Image 2**.
2.  **Expression Matching:** The facial expression from **Image 1** (e.g., smiling, neutral) must be accurately transferred to the new face from **Image 2**. The final expression must look natural.
3.  **Seamless Blending:**
    - **Lighting:** Match the lighting, shadows, and color temperature of **Image 1** perfectly.
    - **Skin Tone:** Adjust the skin tone of the new face to match the neck and body in **Image 1**.
    - **Edges:** Ensure the jawline, hairline, and all facial contours are blended flawlessly with no visible seams.

**Final Output:**
Produce a single, photorealistic image that looks like the person from **Image 2** was originally in the photo from **Image 1**. Do not return the original images. The output must be the newly generated, face-swapped image.`;
    
    const fullPrompt = prompt ? `${systemPrompt}\n\n**Additional User Instructions:** ${prompt}` : systemPrompt;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { text: fullPrompt },
                { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
                { inlineData: { data: targetFaceImage.base64, mimeType: targetFaceImage.mimeType } },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    throw new Error("No image generated.");
};


export const generateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16", image?: { base64: string; mimeType: string }): Promise<string> => {
    const ai = getAi();
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        ...(image && { image: { imageBytes: image.base64, mimeType: image.mimeType } }),
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};


export const analyzeMedia = async (prompt: string, mediaBase64: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const model = mimeType.startsWith('video/') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
        model,
        contents: {
            parts: [
                { inlineData: { data: mediaBase64, mimeType } },
                { text: prompt },
            ],
        },
    });
    return response.text;
};

export const createFastChat = (): Chat => {
    const ai = getAi();
    // FIX: Updated model to use 'gemini-flash-lite-latest' for the most recent version, as per guidelines.
    return ai.chats.create({
        model: 'gemini-flash-lite-latest',
    });
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed.");
    return base64Audio;
};

export const startLiveSession = (callbacks: LiveCallbacks) => {
    const ai = getAi();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: 'You are a friendly and helpful AI assistant.',
        },
    });
};