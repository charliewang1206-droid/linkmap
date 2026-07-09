// ============================================================
// WebLLM (browser-local) parser using @huggingface/transformers
// Runs entirely in the browser with WebGPU — no API key, no server, free.
// NOTE: @huggingface/transformers is imported dynamically inside getGenerator()
// so the ~23MB ONNX wasm runtime is NOT bundled into the main chunk and only
// loads when the user actually picks the local model.
// ============================================================

import type { BatchImportResult } from '../types';
import type { TextGenerationPipeline } from '@huggingface/transformers';

// Small, fast instruct model that runs comfortably in the browser.
const LOCAL_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';

// Cache the pipeline across calls (model download happens only once).
let generatorPromise: Promise<TextGenerationPipeline> | null = null;
let cachedProgressCb: ((p: number) => void) | null = null;

export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function onLocalModelProgress(cb: (p: number) => void) {
  cachedProgressCb = cb;
}

/** 带超时的 Promise 包装器 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000} 秒）`)), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }).catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function getGenerator(): Promise<TextGenerationPipeline> {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const gen = await pipeline('text-generation', LOCAL_MODEL, {
        device: 'webgpu',
        dtype: 'q4',
        // Report download / load progress to the UI.
        progress_callback: (p: { status?: string; progress?: number }) => {
          if (p.status === 'progress' && typeof p.progress === 'number' && cachedProgressCb) {
            cachedProgressCb(p.progress / 100);
          }
        },
      } as never);
      return gen as unknown as TextGenerationPipeline;
    })();
  }
  // 模型下载可能耗时较长，给 5 分钟超时
  return withTimeout(generatorPromise, 300_000, '本地模型加载');
}

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

export async function parseWithWebLLM(text: string): Promise<BatchImportResult> {
  if (!isWebGPUSupported()) {
    throw new Error('当前浏览器不支持 WebGPU，无法运行本地模型。请使用最新版 Chrome/Edge，或改用云端 AI 提供商。');
  }

  const generator = await getGenerator();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ];

  // 本地推理加 2 分钟超时，防止模型卡住
  const output = await withTimeout(
    generator(messages, {
      max_new_tokens: 1024,
      do_sample: false,
      return_full_text: false,
    } as never),
    120_000,
    '本地模型推理'
  );

  // @huggingface/transformers returns an array; the generated text is in
  // the last item's `.generated_text` (string) for chat-formatted input.
  const first = Array.isArray(output) ? output[0] : output;
  const content: string =
    typeof first?.generated_text === 'string'
      ? first.generated_text
      : JSON.stringify(first?.generated_text ?? '');

  try {
    return JSON.parse(content) as BatchImportResult;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as BatchImportResult;
    throw new Error('本地模型返回了无法解析的结果');
  }
}
