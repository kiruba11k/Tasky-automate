import { request } from '@/api/client';

export async function UploadFile({ file }) {
  const form = new FormData();
  form.append('file', file);
  return request('POST', '/api/integrations/upload', form);
}

export function ExtractDataFromUploadedFile({ file_url, json_schema }) {
  return request('POST', '/api/integrations/extract', { file_url, json_schema });
}

export async function InvokeLLM({ prompt, response_json_schema }) {
  const { result } = await request('POST', '/api/integrations/llm', { prompt, response_json_schema });
  return result;
}
