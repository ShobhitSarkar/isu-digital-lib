import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { sessionId, chatInput } = await request.json();

    // Use only the search webhook for now, or you can add logic if you have multiple modes
    const webhookUrl = process.env.N8N_SEARCH_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error(`N8N webhook URL not configured`);
    }

    console.log('Attempting to connect to webhook:', webhookUrl);
    
    try {
      const response = await axios.post(webhookUrl, {
        sessionId,
        chatInput
      }, {timeout: 60000});

      console.log('Logging the response: ', response);

      // Handle both direct response and n8n response format
      const responseData = response.data[0].output;
      
      return NextResponse.json({ response: responseData });
    } catch (axiosError: any) {
      console.error('Webhook connection error:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        url: webhookUrl
      });
      throw new Error(`Failed to connect to webhook: ${axiosError.message}`);
    }
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
} 