/**
 * MaxClaim LLM Router Service
 * Cascading fallback: OpenAI → LocalAI → Rule-based extractor
 * 
 * Implements circuit breaker pattern and automatic failover
 */

export type LLMProvider = 'openai' | 'local-ai' | 'rule-based';

interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model?: string;
  processingTimeMs: number;
  fallbackReason?: string;
  tokensUsed?: number;
}

interface LLMConfig {
  timeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
}

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const defaultConfig: LLMConfig = {
  timeout: 10000, // 10 seconds
  maxRetries: 2,
  circuitBreakerThreshold: 3,
};

// Circuit breaker state for each provider
const circuitBreakers: Record<LLMProvider, CircuitBreaker> = {
  'openai': { failures: 0, lastFailure: 0, isOpen: false },
  'local-ai': { failures: 0, lastFailure: 0, isOpen: false },
  'rule-based': { failures: 0, lastFailure: 0, isOpen: false },
};

const CIRCUIT_RESET_TIME = 60000; // 1 minute

/**
 * Check if a circuit breaker should be reset
 */
function checkCircuitBreaker(provider: LLMProvider): boolean {
  const breaker = circuitBreakers[provider];
  
  if (breaker.isOpen) {
    if (Date.now() - breaker.lastFailure > CIRCUIT_RESET_TIME) {
      breaker.isOpen = false;
      breaker.failures = 0;
      console.log(`[LLM] Circuit breaker reset for ${provider}`);
      return true;
    }
    return false;
  }
  
  return true;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(provider: LLMProvider): void {
  const breaker = circuitBreakers[provider];
  breaker.failures++;
  breaker.lastFailure = Date.now();
  
  if (breaker.failures >= defaultConfig.circuitBreakerThreshold) {
    breaker.isOpen = true;
    console.log(`[LLM] Circuit breaker opened for ${provider}`);
  }
}

/**
 * Record success and reset failures
 */
function recordSuccess(provider: LLMProvider): void {
  circuitBreakers[provider].failures = 0;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !checkCircuitBreaker('openai')) {
    return null;
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(defaultConfig.timeout),
    });

    if (!response.ok) {
      console.error(`[LLM] OpenAI API error: ${response.status}`);
      recordFailure('openai');
      return null;
    }

    const data = await response.json();
    recordSuccess('openai');

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openai',
      model: data.model,
      processingTimeMs: Date.now() - startTime,
      tokensUsed: data.usage?.total_tokens,
    };
  } catch (error) {
    console.error('[LLM] OpenAI error:', error);
    recordFailure('openai');
    return null;
  }
}

/**
 * Call LocalAI API (self-hosted)
 */
async function callLocalAI(
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse | null> {
  const apiUrl = process.env.LOCAL_AI_URL;
  if (!apiUrl || !checkCircuitBreaker('local-ai')) {
    return null;
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LOCAL_AI_MODEL || 'mistral-7b',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(defaultConfig.timeout * 2), // LocalAI may be slower
    });

    if (!response.ok) {
      console.error(`[LLM] LocalAI error: ${response.status}`);
      recordFailure('local-ai');
      return null;
    }

    const data = await response.json();
    recordSuccess('local-ai');

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'local-ai',
      model: data.model,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[LLM] LocalAI error:', error);
    recordFailure('local-ai');
    return null;
  }
}

/**
 * Rule-based extractor (no LLM required)
 * Used for structured claim data extraction
 */
function ruleBasedExtract(prompt: string): LLMResponse {
  const startTime = Date.now();
  
  // Simple pattern matching for claim analysis
  const patterns = {
    roofing: /roof|shingle|gutter|flashing/gi,
    flooring: /floor|carpet|tile|laminate|hardwood/gi,
    drywall: /drywall|wall|ceiling|sheetrock/gi,
    plumbing: /plumb|pipe|faucet|toilet|sink/gi,
    electrical: /electric|wiring|outlet|circuit/gi,
    hvac: /hvac|air condition|heat|furnace/gi,
  };

  // Extract price patterns
  const pricePattern = /\$[\d,]+\.?\d*/g;
  const prices = prompt.match(pricePattern) || [];
  
  // Extract quantity patterns
  const qtyPattern = /(\d+)\s*(sq|sf|lf|ea|units?)/gi;
  const quantities = prompt.match(qtyPattern) || [];

  // Detect categories
  const detectedCategories: string[] = [];
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(prompt)) {
      detectedCategories.push(category);
    }
  }

  const response = JSON.stringify({
    analysis: 'rule-based',
    detectedCategories,
    pricesFound: prices.length,
    quantitiesFound: quantities.length,
    recommendation: detectedCategories.length > 0 
      ? `Review ${detectedCategories.join(', ')} items for potential underpayment`
      : 'Manual review recommended',
  });

  return {
    content: response,
    provider: 'rule-based',
    processingTimeMs: Date.now() - startTime,
    fallbackReason: 'No LLM available, using rule-based extraction',
  };
}

/**
 * Main LLM router with cascading fallback
 */
export async function routeLLMRequest(
  prompt: string,
  options?: {
    systemPrompt?: string;
    preferProvider?: LLMProvider;
  }
): Promise<LLMResponse> {
  const { systemPrompt, preferProvider } = options || {};
  let fallbackReason = '';

  // Try preferred provider first if specified
  if (preferProvider === 'local-ai') {
    const localResult = await callLocalAI(prompt, systemPrompt);
    if (localResult) return localResult;
    fallbackReason = 'LocalAI unavailable';
  }

  // Strategy 1: OpenAI (highest quality)
  if (process.env.OPENAI_API_KEY) {
    const openaiResult = await callOpenAI(prompt, systemPrompt);
    if (openaiResult) {
      console.log('[LLM] OpenAI successful');
      return openaiResult;
    }
    fallbackReason = 'OpenAI unavailable or rate limited';
  }

  // Strategy 2: LocalAI (self-hosted fallback)
  if (process.env.LOCAL_AI_URL) {
    const localResult = await callLocalAI(prompt, systemPrompt);
    if (localResult) {
      console.log('[LLM] LocalAI successful');
      return { ...localResult, fallbackReason };
    }
    fallbackReason = 'LocalAI also unavailable';
  }

  // Strategy 3: Rule-based extraction (always available)
  console.log('[LLM] Falling back to rule-based extraction');
  return {
    ...ruleBasedExtract(prompt),
    fallbackReason: fallbackReason || 'No LLM configured',
  };
}

/**
 * Analyze claim for potential underpayment
 */
export async function analyzeClaimWithLLM(
  claimData: {
    carrier?: string;
    lineItems: Array<{ description: string; quotedPrice: number; category: string }>;
    zipCode: string;
  }
): Promise<{
  analysis: string;
  recommendations: string[];
  confidence: number;
  provider: LLMProvider;
}> {
  const systemPrompt = `You are an insurance claim analyst expert. Analyze the following claim data and identify potential underpayments or missing items. Focus on common issues like:
- Omitted line items (valley flashing, drip edge, permits)
- Undervalued materials or labor
- Missing modifiers (steep charges, second story access)
- Regional price variations

Respond with a JSON object containing:
- analysis: brief summary of findings
- recommendations: array of specific actionable items
- confidence: 0-100 score`;

  const prompt = JSON.stringify(claimData);
  
  const response = await routeLLMRequest(prompt, { systemPrompt });
  
  try {
    const parsed = JSON.parse(response.content);
    return {
      analysis: parsed.analysis || 'Analysis unavailable',
      recommendations: parsed.recommendations || [],
      confidence: parsed.confidence || 50,
      provider: response.provider,
    };
  } catch {
    return {
      analysis: response.content,
      recommendations: [],
      confidence: 30,
      provider: response.provider,
    };
  }
}

/**
 * Get LLM service status for health checks
 */
export function getLLMServiceStatus(): {
  primary: LLMProvider;
  available: LLMProvider[];
  circuitBreakers: Record<LLMProvider, { isOpen: boolean; failures: number }>;
} {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasLocalAI = !!process.env.LOCAL_AI_URL;

  const available: LLMProvider[] = ['rule-based'];
  if (hasLocalAI) available.unshift('local-ai');
  if (hasOpenAI) available.unshift('openai');

  return {
    primary: hasOpenAI ? 'openai' : hasLocalAI ? 'local-ai' : 'rule-based',
    available,
    circuitBreakers: {
      openai: { isOpen: circuitBreakers.openai.isOpen, failures: circuitBreakers.openai.failures },
      'local-ai': { isOpen: circuitBreakers['local-ai'].isOpen, failures: circuitBreakers['local-ai'].failures },
      'rule-based': { isOpen: false, failures: 0 },
    },
  };
}
