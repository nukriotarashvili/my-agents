import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/ai-models';

export async function GET() {
  return NextResponse.json({ success: true, models: AVAILABLE_MODELS });
}
