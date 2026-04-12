export async function transcribeWithFalai(audioUrl: string, language = 'tr'): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/whisper', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio_url: audioUrl, language }),
  })

  if (!response.ok) {
    throw new Error(`fal.ai STT error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.text as string
}
