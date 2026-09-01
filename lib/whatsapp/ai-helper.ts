import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_build_key_to_bypass_vercel_validation",
});

export async function transcribeVoiceNote(audioBuffer: Buffer): Promise<string | null> {
  try {
    const file = await toFile(audioBuffer, "audio.ogg", { type: "audio/ogg" });
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1", // Standard OpenAI Whisper model
    });
    return transcription.text;
  } catch (error) {
    console.error("[OpenAI STT Error]", error);
    return null;
  }
}
