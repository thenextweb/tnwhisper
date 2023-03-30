import fetch from 'node-fetch'

const apiKey = process.env.GPT_API_KEY

async function sendToGPT(prompt) {
  const url = 'https://api.openai.com/v1/engines/davinci-codex/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  return data.choices[0].text.trim()
}

export { sendToGPT }
