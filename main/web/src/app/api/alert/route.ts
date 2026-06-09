import { AlertData } from '@/features/alert/types';

export async function POST(request: Request) {
  const body = (await request.json()) as AlertData;

  return new Response(JSON.stringify({ ok: true, received: body }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
