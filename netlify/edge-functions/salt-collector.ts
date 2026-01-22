import { createCollector } from '@salt-security/collector';
import type { Context } from '@netlify/edge-functions';

// Initialize the collector once (outside the handler for efficiency)
const collector = createCollector({
  hybridUrl: Netlify.env.get('SALT_HYBRID_URL')!,
  hybridToken: Netlify.env.get('SALT_HYBRID_TOKEN')!,
  collectorUuid: Netlify.env.get('SALT_COLLECTOR_UUID')!,
  debug: Netlify.env.get('SALT_DEBUG') === 'true',

  // Maximum exchange size in bytes (3.99MB)
  // Exchanges larger than this will be dropped
  maxExchangeSizeBytes: 4182425,
  // Whether to allow collecting bodies without Content-Length header
  // Can cause OOM if large bodies are sent without length
  allowBodyWithoutContentLengthHeader:true,
  collectExchangeWithoutBody:true,
  // Optional metadata
  collectorPlatform: 'netlify',
  collectorLabels: {
    environment: Netlify.env.get('CONTEXT') || 'production',
  },
});

export default async (request: Request, context: Context) => {
  // IMPORTANT: Clone the request BEFORE calling context.next() to capture request bodies
  // This is necessary for POST/PUT/PATCH requests with bodies
  const requestForCollection = request.clone();

  // Pass the request through to the next handler in the chain
  // This allows next edge functions and the backend to process it
  const response = await context.next();

  // Collect traffic data using the cloned request
  // This waits for bodies to be collected and sent before returning
  return await collector.collect(requestForCollection, response,context);
};

// Configure which paths this edge function runs on
export const config = {
  path: '/*', // Run on all /* paths to collect API traffic
};
