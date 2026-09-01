import OpenAI from "openai";
import fs from "fs";

async function test() {
  const openai = new OpenAI({
    apiKey: "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",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
  
  // write a tiny dummy 1 second audio file or fetch one
  console.log("Testing NVIDIA NIM...");
  try {
    // we just want to see if the URL and model exist, so we pass a dummy file to see if it complains about format rather than 404
    // or maybe the base URL for NVIDIA NIM is https://integrate.api.nvidia.com/v1/audio/transcriptions?
  } catch (e) {
    console.error(e);
  }
}
test();
