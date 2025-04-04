import jwt from 'jsonwebtoken';

// Get the Supabase service role key from env vars
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Extract the JWT secret from the Supabase service role key, same way as soulgraph_production
// The JWT secret is the last part of the service key after the last '.'
function extractJwtSecret(): string {
  // If NEXT_PUBLIC_MOCK_JWT_SECRET is set in .env.local, use that
  const configuredSecret = process.env.NEXT_PUBLIC_MOCK_JWT_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }
  
  // Otherwise extract from the service role key just like soulgraph_production does
  try {
    if (SUPABASE_SERVICE_ROLE_KEY) {
      // The format of the Supabase JWT key is: [header].[payload].[signature]
      // We want the signature part (the last segment)
      return SUPABASE_SERVICE_ROLE_KEY.split('.').pop() || 'mock-jwt-secret-for-testing';
    }
  } catch (error) {
    console.error('Error extracting JWT secret from Supabase key:', error);
  }
  
  return 'mock-jwt-secret-for-testing';
}

// Get the JWT secret
const JWT_SECRET = extractJwtSecret();
const TEST_USER_ID = 'test-user-123';
const JWT_ALGORITHM = 'HS256';

// Log the first few characters of the secret for debugging (don't log the full secret)
console.log(`Using JWT secret starting with: ${JWT_SECRET.substring(0, 3)}...`);

// This function generates a mock Supabase JWT token for testing purposes
export function generateMockSupabaseToken(): string {
  // Extract Supabase project reference from URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = '';
  
  try {
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      projectRef = url.hostname.split('.')[0];
    }
  } catch (error) {
    console.error('Error extracting project reference from Supabase URL:', error);
  }
  
  // Current time in seconds
  const now = Math.floor(Date.now() / 1000);
  
  // Create token payload following Supabase JWT structure
  const payload = {
    // Standard JWT claims
    iss: projectRef ? `https://${projectRef}.supabase.co/auth/v1` : 'https://api.example.com/auth/v1',
    sub: TEST_USER_ID,
    aud: 'authenticated',
    exp: now + 3600, // Token expires in 1 hour
    iat: now,
    
    // Supabase specific claims
    email: 'test@example.com',
    phone: '',
    app_metadata: {
      provider: 'email',
      providers: ['email']
    },
    user_metadata: {
      name: 'Test User'
    },
    role: 'authenticated'
  };
  
  // Generate and return the token
  return jwt.sign(payload, JWT_SECRET, { algorithm: JWT_ALGORITHM });
}

// Utility function to get an Authorization header with the token
export function getAuthHeader(): { Authorization: string } {
  const token = generateMockSupabaseToken();
  return { Authorization: `Bearer ${token}` };
} 