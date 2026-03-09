import OpenAI from 'openai';

/**
 * AI Mentoring Normalization Service
 * Converts unstructured mentoring text into structured data
 */

// Initialize OpenAI client (optional - only if you have API key)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Normalize mentoring text using AI
 * @param {string} text - Raw mentoring text from instructor
 * @returns {Promise<object>} Structured mentoring data
 */
export async function normalizeMentoringText(text: string): Promise<{
  frequency?: string;
  format?: string;
  flexibility?: string;
} | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // If OpenAI is configured, use AI normalization
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a data normalization assistant. Extract structured mentoring information from unstructured text.
            
Return ONLY valid JSON with these optional fields:
- frequency: "daily" | "weekly" | "bi-weekly" | "monthly" | "on-demand"
- format: "Q&A" | "Discord" | "WhatsApp" | "Email" | "Video Call" | "Live Sessions"
- flexibility: "strict-schedule" | "flexible" | "on-demand" | "within-24h" | "within-48h"

If information is not clear, omit that field.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }
    } catch (error) {
      console.error('AI normalization failed:', error);
      // Fall through to rule-based approach
    }
  }

  // Fallback: Rule-based normalization
  return ruleBasedNormalization(text);
}

/**
 * Rule-based normalization (fallback when no AI)
 */
function ruleBasedNormalization(text: string): {
  frequency?: string;
  format?: string;
  flexibility?: string;
} {
  const lowerText = text.toLowerCase();
  const result: any = {};

  // Extract frequency
  if (lowerText.includes('daily') || lowerText.includes('every day')) {
    result.frequency = 'daily';
  } else if (lowerText.includes('weekly') || lowerText.includes('every week')) {
    result.frequency = 'weekly';
  } else if (lowerText.includes('twice') && lowerText.includes('week')) {
    result.frequency = 'twice-weekly';
  } else if (lowerText.includes('bi-weekly') || lowerText.includes('biweekly')) {
    result.frequency = 'bi-weekly';
  } else if (lowerText.includes('monthly') || lowerText.includes('every month')) {
    result.frequency = 'monthly';
  } else if (lowerText.includes('on demand') || lowerText.includes('on-demand') || lowerText.includes('as needed')) {
    result.frequency = 'on-demand';
  }

  // Extract format
  if (lowerText.includes('q&a') || lowerText.includes('question') || lowerText.includes('doubt')) {
    result.format = 'Q&A';
  } else if (lowerText.includes('discord')) {
    result.format = 'Discord';
  } else if (lowerText.includes('whatsapp') || lowerText.includes('whats app')) {
    result.format = 'WhatsApp';
  } else if (lowerText.includes('email')) {
    result.format = 'Email';
  } else if (lowerText.includes('video call') || lowerText.includes('zoom') || lowerText.includes('meet')) {
    result.format = 'Video Call';
  } else if (lowerText.includes('live session') || lowerText.includes('live class')) {
    result.format = 'Live Sessions';
  }

  // Extract flexibility
  if (lowerText.includes('24 hour') || lowerText.includes('within 24')) {
    result.flexibility = 'within-24h';
  } else if (lowerText.includes('48 hour') || lowerText.includes('within 48')) {
    result.flexibility = 'within-48h';
  } else if (lowerText.includes('flexible') || lowerText.includes('when needed')) {
    result.flexibility = 'flexible';
  } else if (lowerText.includes('on demand') || lowerText.includes('on-demand')) {
    result.flexibility = 'on-demand';
  } else if (lowerText.includes('strict') || lowerText.includes('scheduled')) {
    result.flexibility = 'strict-schedule';
  }

  return result;
}

/**
 * Example usage in course service
 */
export async function processMentoringText(courseId: string, mentoringText: string) {
  const structured = await normalizeMentoringText(mentoringText);
  
  // Update course with both raw and structured data
  // This would be called from your course update endpoint
  return {
    mentoring_text: mentoringText,
    mentoring_structured: structured
  };
}

// ============================================
// Test Examples (for verification)
// ============================================

// Example 1: "weekly doubt solving maybe extra classes if needed"
// Expected: { frequency: "weekly", format: "Q&A", flexibility: "on-demand" }

// Example 2: "Discord community for peer support, instructor responds within 24 hours"
// Expected: { frequency: "ongoing", format: "community + async", flexibility: "on-demand" }

// Example 3: "Daily Q&A sessions, very flexible, available on WhatsApp"
// Expected: { frequency: "daily", format: "Q&A", flexibility: "flexible" }

// Example 4: "Bi-weekly live sessions, strict schedule, email support between sessions"
// Expected: { frequency: "bi-weekly", format: "live sessions", flexibility: "structured" }

// To test: Import and call normalizeMentoringText() from your controller or API endpoint
