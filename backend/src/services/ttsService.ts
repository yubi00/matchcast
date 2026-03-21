import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import config from '../config';
import logger from '../utils/logger';

const elevenlabs = new ElevenLabsClient({ apiKey: config.elevenLabsApiKey });

export async function generateAudio(text: string): Promise<string | null> {
  try {
    const stream = await elevenlabs.textToSpeech.convert(config.elevenLabsVoiceId, {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('base64');
  } catch (err) {
    logger.warn({ err }, 'ElevenLabs TTS error — falling back to text only');
    return null;
  }
}
