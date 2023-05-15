import fetch from 'node-fetch'

const apiKey = process.env.GPT_API_KEY

async function sendToGPT(prompt) {
  const url = 'https://api.openai.com/v1/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      // n: 1,
      stop: null,
      model: 'text-davinci-003',
      max_tokens: 350,
      top_p: 0.3,
      frequency_penalty: 0.5,
      presence_penalty: 0.0,
      temperature: 0.3,
    }),
  })

  const data = await response.json()
  return data.choices[0].text.trim()
}

export { sendToGPT }
