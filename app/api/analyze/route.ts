import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { MASTER_PROMPT } from '@/lib/masterPrompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

type ContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    };

interface RequestBody {
  sessionMessages: { role: 'user' | 'assistant'; content: string }[];
  userText: string;
  images: string[]; // base64 data URLs
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    const body: RequestBody = await req.json();
    const { sessionMessages, userText, images } = body;

    if (!userText && images.length === 0) {
      return NextResponse.json(
        { error: 'Please provide text or images' },
        { status: 400 }
      );
    }

    // Build user content array
    const userContent: ContentPart[] = [];
    
    if (userText) {
      userContent.push({ type: 'text', text: userText });
    }
    
    // Add images as base64 data URLs (OpenAI accepts these directly)
    for (const base64Image of images) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: base64Image,
          detail: 'high',
        },
      });
    }

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: MASTER_PROMPT,
      },
      ...sessionMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: userContent,
      },
    ];

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      max_tokens: 4096,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      text: assistantMessage,
      usage: response.usage,
    });

  } catch (error: unknown) {
    console.error('API Error:', error);
    
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
