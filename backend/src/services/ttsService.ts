import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { UTApi } from 'uploadthing/server';
import config from '../config';
import logger from '../utils/logger';

const elevenlabs = new ElevenLabsClient({ apiKey: config.elevenLabsApiKey });
const utapi = new UTApi({ token: config.uploadThingToken });

export async function generateAudio(fixtureId: number, text: string): Promise<string | null> {
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

    const buffer = Buffer.concat(chunks);
    const file = new File([buffer], `fixture-${fixtureId}.mp3`, { type: 'audio/mpeg' });
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      logger.warn({ error: response.error }, 'UploadThing upload failed — falling back to text only');
      return null;
    }

    return response.data.ufsUrl;
  } catch (err) {
    logger.warn({ err }, 'ElevenLabs TTS error — falling back to text only');
    return null;
  }
}
