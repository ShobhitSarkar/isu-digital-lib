import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { message, mode } = await request.json();

    // Select the appropriate webhook URL based on the mode
    const webhookUrl = mode === 'search' 
      ? process.env.N8N_SEARCH_WEBHOOK_URL 
      : process.env.N8N_CHAT_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error(`N8N webhook URL not configured for mode: ${mode}`);
    }

    const response = await axios.post(webhookUrl, {
      message,
      mode,
    });

    return NextResponse.json({ response: response.data });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 