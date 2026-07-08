import type { AIProviderConfig, BatchImportResult } from '../types';
import { decryptAPIKey } from './crypto';

const SYSTEM_PROMPT = `你是一个专业的文本解析助手。用户会给你一段描述人际关系的自然语言文本，请解析出人物列表和关系列表。

请严格按以下 JSON 格式输出，不要包含任何其他内容：
{
  "persons": [
    { "name": "姓名", "city": "城市(可选)", "title": "职位(可选)", "company": "公司(可选)", "tags": ["标签1"], "notes": "备注(可选)" }
  ],
  "relations": [
    { "fromName": "源人物姓名", "toName": "目标人物姓名", "type": "关系类型" }
  ]
}

关系类型请使用以下之一：朋友、同事、客户、亲戚、同学、介绍人、合作过、想维护
如果关系不属于以上类型，可使用其他简短描述。
如果一个公司/组织名出现在描述中，把它作为公司字段而非标签。
如果没有明确说明，city 和 title 留空字符串，tags 留空数组。`;

export async function parseWithAI(
  text: string,
  provider: AIProviderConfig
): Promise<BatchImportResult> {
  const apiKey = await decryptAPIKey(provider.apiKeyEncrypted, provider.apiKeyIV);

  if (provider.type === 'anthropic') {
    return parseWithAnthropic(text, provider, apiKey);
  }
  // OpenAI and custom providers use OpenAI-compatible API
  return parseWithOpenAI(text, provider, apiKey);
}

async function parseWithOpenAI(
  text: string,
  provider: AIProviderConfig,
  apiKey: string
): Promise<BatchImportResult> {
  const baseURL = provider.type === 'openai'
    ? 'https://api.openai.com/v1'
    : (provider.baseURL || 'https://api.openai.com/v1');
  const model = provider.model || (provider.type === 'openai' ? 'gpt-4o-mini' : 'gpt-3.5-turbo');

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API 错误 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI 返回了空内容');

  try {
    return JSON.parse(content) as BatchImportResult;
  } catch {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as BatchImportResult;
    }
    throw new Error('无法解析 AI 返回的结果');
  }
}

async function parseWithAnthropic(
  text: string,
  provider: AIProviderConfig,
  apiKey: string
): Promise<BatchImportResult> {
  const model = provider.model || 'claude-3-haiku-20240307';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT + '\n\n请只返回 JSON，不要包含任何其他文本。',
      messages: [
        { role: 'user', content: text },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API 错误 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Anthropic 返回了空内容');

  try {
    return JSON.parse(content) as BatchImportResult;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as BatchImportResult;
    }
    throw new Error('无法解析 AI 返回的结果');
  }
}
