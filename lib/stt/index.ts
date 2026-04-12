import { transcribeWithFalai } from './adapters/falai'

export async function getTranscript(audioUrl: string, language = 'tr'): Promise<string> {
  const provider = process.env.STT_PROVIDER ?? 'falai'

  switch (provider) {
    case 'falai':
      return transcribeWithFalai(audioUrl, language)
    default:
      throw new Error(`Unknown STT provider: ${provider}`)
  }
}
