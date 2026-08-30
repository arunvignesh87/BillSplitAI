import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '../config/firebase';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const analyzeSubscriptions = async (subscriptions, currency = 'USD') => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const total = subscriptions.reduce((sum, s) => sum + (s.cost || 0), 0);
  const subList = subscriptions.map(s =>
    `- ${s.name} (${s.category}): ${currency} ${s.cost}/month, last used: ${s.lastUsed || 'unknown'}`
  ).join('\n');

  const prompt = `You are a personal finance AI assistant. Analyze these subscriptions and provide actionable insights.

User's Subscriptions (Total: ${currency} ${total.toFixed(2)}/month):
${subList}

Please provide:
1. **Spending Summary** - Quick overview in 2 sentences
2. **Waste Alerts** - Which subscriptions might be wasteful (3-4 points)
3. **Money-Saving Tips** - Specific actionable tips to save money (3-4 points)
4. **Smart Alternatives** - Suggest free or cheaper alternatives for expensive subs
5. **Monthly Savings Potential** - Estimate how much they could save

Keep the response concise, friendly, and actionable. Use emojis sparingly.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const getBillSplitAdvice = async (groupName, expenses, members) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const expList = expenses.map(e =>
    `- ${e.description}: $${e.amount} (paid by ${e.paidBy})`
  ).join('\n');

  const prompt = `Analyze this group expense and provide a fair settlement plan.

Group: ${groupName}
Members: ${members.join(', ')}
Total Expenses: $${totalAmount.toFixed(2)}

Expenses:
${expList}

Provide:
1. Clear who owes what to whom (settlement plan)
2. Any observations about spending patterns
3. Tips for future expense sharing

Keep it short and practical.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Parse SMS/message text and extract subscription details using Gemini AI.
 * Returns an array of subscription objects with { name, cost, category, renewalDate, notes }
 */
export const parseSubscriptionsFromSMS = async (smsText) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a financial data extraction AI. Extract ALL subscription/recurring payment details from these SMS messages or transaction messages.

SMS/Messages:
"""
${smsText}
"""

Today's date: ${today}

For each subscription or recurring charge found, return a JSON array. Each item must have:
- "name": service/company name (e.g., "Netflix", "Spotify", "Amazon Prime")
- "cost": monthly cost as a number (convert yearly to monthly if needed, e.g. yearly/12)
- "category": one of: Entertainment, Music, Software, Gaming, Health, Food, Shopping, News, Education, Finance, Other
- "renewalDate": next renewal date in YYYY-MM-DD format (estimate if not explicit)
- "notes": brief note about what was detected

Rules:
- Only include clear subscription/recurring charges, not one-time purchases
- If amount is yearly, divide by 12 for monthly cost
- If renewal date is past, add 1 month to get next renewal
- Return ONLY valid JSON array, no markdown, no explanation

If no subscriptions found, return: []`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
