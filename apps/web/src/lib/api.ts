export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export type User = { id: string; email: string | null; phone: string | null; displayName: string | null };
export type Recipient = {
  id: string; displayName: string; relationship: string | null;
  interests: string[]; dislikes: string[]; notes: string | null;
};
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_URL + '/api' + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  }
  if (!response.ok) {
    let message = 'Có lỗi xảy ra. Vui lòng thử lại.';
    try {
      const body = await response.json();
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch { /* Keep the default error. */ }
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json() as Promise<T>;
}
