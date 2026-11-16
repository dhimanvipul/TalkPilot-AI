/**
 * Free & High-Speed AI Client for TalkPilot AI
 * Integrates top LLM providers for natural human conversational voice dialogues:
 * 1. Google Gemini Flash (GEMINI_API_KEY - Free Tier, Fast, High Quality)
 * 2. Groq Cloud Llama 3.3 / 3.1 (GROQ_API_KEY - Free Tier, ~200ms ultra low latency)
 * 3. OpenAI / Compatible (OPENAI_API_KEY / AI_API_KEY)
 * 4. Multi-model zero-setup free fallback endpoints (Pollinations / Open LLMs)
 */

class FreeAIClient {
  constructor() {
    this.pollinationsEndpoint = 'https://text.pollinations.ai/openai';
    this.pollinationsDirectEndpoint = 'https://text.pollinations.ai/';
  }

  /**
   * Cleans text to make it sound natural when spoken by ElevenLabs or voice synthesis
   */
  cleanSpokenText(raw) {
    if (!raw || typeof raw !== 'string') return '';

    let text = raw.trim();

    // 1. Remove reasoning / thought blocks if any (e.g. <think>...</think>)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Remove speaker prefixes like "TalkPilot:", "AI:", "Assistant:", "Priya:", "Rachel:"
    text = text.replace(/^(TalkPilot|AI|Assistant|Counselor|Officer|Representative|Rachel|Adam|Bot)\s*:\s*/i, '');

    // 3. Remove markdown bold, italic, code ticks
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    text = text.replace(/`([^`]+)`/g, '$1');

    // 4. Remove markdown headers, list markers, hashtags
    text = text.replace(/^#+\s*/gm, '');
    text = text.replace(/^[-*•]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // 5. Remove emojis so text-to-speech doesn't attempt to read emoji names
    text = text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ''
    );

    // 6. Remove quotes around the entire string if present
    text = text.replace(/^["']|["']$/g, '').trim();

    // 7. Collapse multi-spaces and newlines into natural spoken sentence spacing
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Main completion method that dispatches to available AI providers
   */
  async generateReply({ messages, systemPrompt, temperature = 0.7, maxTokens = 150 }) {
    // Build OpenAI-style messages array with system prompt first
    const fullMessages = [];
    if (systemPrompt) {
      fullMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      fullMessages.push({
        role: msg.role === 'AI' || msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || msg.text || ''
      });
    }

    // Provider override from env
    const provider = (process.env.AI_PROVIDER || '').toLowerCase();

    // 1. If Groq is configured or prioritized
    const groqKey = process.env.GROQ_API_KEY || (provider === 'groq' ? process.env.AI_API_KEY : null);
    if (groqKey) {
      try {
        const groqReply = await this.callGroq(fullMessages, groqKey, temperature, maxTokens);
        if (groqReply) return this.cleanSpokenText(groqReply);
      } catch (err) {
        console.warn('[FreeAIClient] Groq call failed, trying next provider:', err.message);
      }
    }

    // 2. If Google Gemini is configured or prioritized (Auto-activate if GEMINI_API_KEY is present)
    const geminiKey = process.env.GEMINI_API_KEY || (provider === 'gemini' ? process.env.AI_API_KEY : null);
    if (geminiKey) {
      try {
        const geminiReply = await this.callGemini(fullMessages, geminiKey, temperature, maxTokens);
        if (geminiReply) return this.cleanSpokenText(geminiReply);
      } catch (err) {
        console.warn('[FreeAIClient] Gemini call failed, trying next provider:', err.message);
      }
    }

    // 3. If OpenAI is configured or prioritized
    const openAiKey = process.env.OPENAI_API_KEY || (provider === 'openai' ? process.env.AI_API_KEY : null);
    if (openAiKey) {
      try {
        const openAiReply = await this.callOpenAI(fullMessages, openAiKey, temperature, maxTokens);
        if (openAiReply) return this.cleanSpokenText(openAiReply);
      } catch (err) {
        console.warn('[FreeAIClient] OpenAI call failed, trying next provider:', err.message);
      }
    }

    // 4. Default zero-setup Free AI: Pollinations Multi-Model Fallback
    try {
      const pollinationsReply = await this.callPollinations(fullMessages, temperature);
      if (pollinationsReply) return this.cleanSpokenText(pollinationsReply);
    } catch (err) {
      console.warn('[FreeAIClient] Pollinations call failed:', err.message);
    }

    return null;
  }

  /**
   * Groq Cloud caller (Free Tier, ultra-fast ~200ms latency)
   */
  async callGroq(messages, apiKey, temperature = 0.7, maxTokens = 150) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === 'string') return content;
      } else {
        const errText = await res.text();
        console.warn(`[Groq Error ${res.status}]:`, errText);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
    return null;
  }

  /**
   * Google Gemini caller (Gemini 2.5 Flash / Gemini Flash Latest)
   */
  async callGemini(messages, apiKey, temperature = 0.7, maxTokens = 150) {
    const modelsToTry = [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-1.5-flash'
    ].filter(Boolean);

    // Convert messages to Gemini format once
    const contents = [];
    let systemInstruction = null;

    for (const m of messages) {
      if (m.role === 'system') {
        systemInstruction = { parts: [{ text: m.content }] };
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }
    }

    const bodyPayload = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: Math.max(800, maxTokens),
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = systemInstruction;
    }

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && typeof text === 'string') return text;
        } else {
          const errText = await res.text();
          console.warn(`[Gemini ${model} Error ${res.status}]:`, errText);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        // Try next model candidate
      }
    }

    return null;
  }

  /**
   * Standard OpenAI / Compatible caller
   */
  async callOpenAI(messages, apiKey, temperature = 0.7, maxTokens = 150) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    try {
      const endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
    return null;
  }

  /**
   * Pollinations AI multi-model caller (100% Free, Zero Setup)
   */
  async callPollinations(messages, temperature = 0.7) {
    // 1. Direct endpoint attempt with low timeout
    try {
      const directController = new AbortController();
      const directTimeoutId = setTimeout(() => directController.abort(), 3500);

      const directRes = await fetch(this.pollinationsDirectEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TalkPilot-AI/2.0'
        },
        body: JSON.stringify({
          messages,
          seed: Math.floor(Math.random() * 100000)
        }),
        signal: directController.signal
      });

      clearTimeout(directTimeoutId);

      if (directRes.ok) {
        const rawText = await directRes.text();
        if (
          rawText &&
          !rawText.includes('Free limit reached') &&
          !rawText.startsWith('<!DOCTYPE') &&
          rawText.trim().length > 5
        ) {
          return rawText;
        }
      }
    } catch (err) {
      // Direct attempt timed out, try /openai endpoint
    }

    // 2. OpenAI endpoint attempt with mistral or openai model
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(this.pollinationsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TalkPilot-AI/2.0'
        },
        body: JSON.stringify({
          model: 'mistral',
          messages,
          temperature,
          seed: Math.floor(Math.random() * 100000)
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && typeof content === 'string' && !content.includes('Free limit reached')) {
          return content;
        }
      }
    } catch (err) {
      // Finished
    }

    return null;
  }
}

module.exports = new FreeAIClient();
