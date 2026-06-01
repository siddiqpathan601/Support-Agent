const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatResponse {
  response: string;
  intent?: string;
  error?: string;
  tool_history?: ToolCallEntry[];
}

export interface ToolCallEntry {
  tool: string;
  output: Record<string, unknown>;
  error: string | null;
  execution_time_ms: number;
}

export interface ToolCallEvent {
  name: string;
  input: Record<string, unknown>;
  output_summary: string;
  ms: number;
  error?: string | null;
}

export interface BirthDetails {
  name: string;
  date: string;
  time: string;
  place: string;
}

// ── Synchronous chat (fallback) ─────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  birthDetails?: BirthDetails | null,
  history?: { role: string; content: string }[]
): Promise<ChatResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      birth_details: birthDetails || null,
      history: history || [],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// ── Streaming chat via SSE ──────────────────────────────────────────────────

export async function streamChat(
  message: string,
  birthDetails: BirthDetails | null,
  history: { role: string; content: string }[],
  onToolCall: (tool: ToolCallEvent) => void,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        birth_details: birthDetails || null,
        history: history || [],
      }),
    });

    if (!response.ok) {
      onError(`Server error: ${response.status} ${response.statusText}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response stream available');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const data = JSON.parse(jsonStr);

          if (data.tool_call) {
            onToolCall(data.tool_call);
          } else if (data.token) {
            onToken(data.token);
          } else if (data.done) {
            onDone();
            return;
          } else if (data.error) {
            onError(data.error);
            return;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onError(msg);
  }
}
