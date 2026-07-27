import type { AustralianFinancialYear } from '../types/tax';
import { getActiveAiProvider, sendChatMessage } from './aiChatClient';
import { redactSensitiveData } from '../storage/privacyLog';

export interface AiOptimizationSuggestion {
  title: string;
  description: string;
  alreadyClaimed: boolean;
}

export interface AiOptimizationResult {
  estimatedExtraDeductions: number;
  potentialTaxSavings: number;
  summary: string;
  suggestions: AiOptimizationSuggestion[];
}

const SYSTEM_PROMPT = `You are an Australian Taxation Office (ATO) deduction specialist embedded in ATO Lens, a local-first tax workspace. Given a taxpayer's occupation and a redacted summary of their financial year, identify realistic, ATO-allowable work-related deduction categories they have likely NOT yet fully claimed, and estimate the extra deductions and resulting tax savings.

Ground your suggestions in real 2025-26 ATO rules (e.g. the 70c/hour working-from-home fixed rate, $300 immediate write-off threshold for tools/equipment, self-education, union/professional memberships, income protection insurance, tax agent fees). Be conservative and realistic - do not suggest anything an employee could not legitimately substantiate.

Respond with ONLY minified JSON (no markdown fences, no commentary) matching exactly this shape:
{"estimatedExtraDeductions":<number>,"potentialTaxSavings":<number>,"summary":"<one sentence>","suggestions":[{"title":"<short title>","description":"<one or two sentences>","alreadyClaimed":<boolean>}]}

Return between 3 and 6 suggestions. Never request or repeat a Tax File Number, Medicare number, or bank details.`;

/**
 * Asks the user's configured AI provider (Claude/OpenAI/Gemini) to analyse their
 * financial year for missed deduction opportunities. Returns null if no provider
 * is configured, or if the request fails/produces an unparseable response - the
 * caller should fall back to the local occupation-benchmark heuristic in that case.
 */
export async function generateAiTaxOptimization(
  fy: AustralianFinancialYear,
  occupation: string
): Promise<AiOptimizationResult | null> {
  const provider = getActiveAiProvider();
  if (!provider) return null;

  const claimedCategories =
    fy.deductions.map((d) => `${d.category} ($${d.amount.value.toLocaleString()})`).join(', ') || 'none recorded yet';

  const userPrompt = redactSensitiveData(
    `Occupation: ${occupation}\n` +
      `Financial year: ${fy.label}\n` +
      `Gross income: $${fy.grossIncome.toLocaleString()}\n` +
      `Current total claimed deductions: $${fy.totalDeductions.toLocaleString()}\n` +
      `Deduction categories already claimed: ${claimedCategories}\n` +
      `Effective tax rate: ${fy.effectiveTaxRate}%\n\n` +
      `Identify likely-missed ATO-allowable work-related deduction categories for this occupation and estimate realistic extra deductions and tax savings for ${fy.label}.`
  );

  try {
    const raw = await sendChatMessage(provider, SYSTEM_PROMPT, [], userPrompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]);
    if (typeof parsed.estimatedExtraDeductions !== 'number' || !Array.isArray(parsed.suggestions)) {
      return null;
    }

    const suggestions: AiOptimizationSuggestion[] = parsed.suggestions
      .filter((s: any) => s && typeof s.title === 'string')
      .slice(0, 6)
      .map((s: any) => ({
        title: s.title,
        description: typeof s.description === 'string' ? s.description : '',
        alreadyClaimed: Boolean(s.alreadyClaimed)
      }));

    if (suggestions.length === 0) return null;

    return {
      estimatedExtraDeductions: Math.max(0, Math.round(parsed.estimatedExtraDeductions)),
      potentialTaxSavings:
        typeof parsed.potentialTaxSavings === 'number'
          ? Math.max(0, Math.round(parsed.potentialTaxSavings))
          : Math.round(Math.max(0, parsed.estimatedExtraDeductions) * 0.3),
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      suggestions
    };
  } catch (err) {
    console.warn('[ATO Lens] AI tax optimization request failed, falling back to local estimate:', err);
    return null;
  }
}
