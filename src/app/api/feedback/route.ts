import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { dispatchFeedbackNotifications, getCategoryMeta } from '@/lib/feedback-notifications';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    // Rate limit: max 5 feedback submissions per 60 seconds per IP
    if (isRateLimited(`feedback:${ip}`, Date.now(), { maxRequests: 5, windowMs: 60_000 })) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { category, subject, message, email } = body;

    const validCategories = ['suggestion', 'bug_report', 'feedback', 'just_saying_hi', 'other'];
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Please select a valid message category.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message cannot exceed 2,000 characters.' }, { status: 400 });
    }

    if (subject && typeof subject === 'string' && subject.length > 200) {
      return NextResponse.json({ error: 'Subject is too long.' }, { status: 400 });
    }

    if (email && typeof email === 'string' && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }
    }

    const submittedAt = new Date().toISOString();
    const feedbackEntry = {
      category,
      subject: (subject || '').trim(),
      message: message.trim(),
      email: (email || '').trim() || null,
      submittedAt,
    };

    let docId = 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

    // 1. Persist to Firestore
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        const feedbackCol = collection(db, 'feedback');
        const docRef = await addDoc(feedbackCol, {
          ...feedbackEntry,
          createdAt: serverTimestamp(),
        });
        docId = docRef.id;
      }
    } catch (dbError) {
      console.warn('[Feedback API] Firestore write omitted/failed, continuing with notification dispatch:', dbError);
    }

    // 2. Dispatch multi-channel notifications (Email, Discord, Telegram, Local Inbox)
    const notificationResult = await dispatchFeedbackNotifications({
      id: docId,
      category,
      categoryLabel: getCategoryMeta(category).label,
      subject: (subject || '').trim(),
      message: message.trim(),
      email: (email || '').trim() || null,
      submittedAt,
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      id: docId,
      dispatched: notificationResult.channelsNotified,
    });
  } catch (error) {
    console.error('[Feedback API] Error handling submission:', error);
    return NextResponse.json({ error: 'Failed to submit message. Please try again later.' }, { status: 500 });
  }
}

/**
 * Developer inbox reader endpoint:
 * Allows the developer to inspect received messages in development or with admin key
 */
export async function GET(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production';
    const authHeader = request.headers.get('authorization') || '';
    const adminKey = process.env.FEEDBACK_ADMIN_KEY || process.env.CRON_SECRET;
    const isAuthorized = isDev || (adminKey && authHeader === `Bearer ${adminKey}`);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const messages: any[] = [];

    // Read local inbox file if exists
    try {
      const filePath = path.join(process.cwd(), 'data', 'feedback-inbox.jsonl');
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          messages.push(JSON.parse(line));
        } catch {}
      }
    } catch {}

    // Reverse to show newest first
    messages.reverse();

    return NextResponse.json({
      count: messages.length,
      messages: messages.slice(0, 50),
    });
  } catch (error) {
    console.error('[Feedback API] Error reading inbox:', error);
    return NextResponse.json({ error: 'Failed to retrieve inbox messages.' }, { status: 500 });
  }
}
