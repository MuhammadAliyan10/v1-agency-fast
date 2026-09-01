import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "dummy_build_key_to_bypass_vercel_validation",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function transcribeVoiceNote(audioBuffer: Buffer): Promise<string | null> {
  try {
    const file = await toFile(audioBuffer, "audio.ogg", { type: "audio/ogg" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "openai/whisper-large-v3", // NVIDIA NIM OpenAI-compatible model identifier for Whisper
    });
    return transcription.text;
  } catch (error) {
    console.error("[NVIDIA NIM STT Error]", error);
    return null;
  }
}
