// KidGuard - Auth Handler
// Register & Login

// Simple JWT implementation for Cloudflare Workers
async function generateToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${sig}`;
}

async function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const data = `${header}.${body}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(data)
    );
    
    if (!valid) return null;
    return JSON.parse(atob(body));
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function handleAuth(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // =====================
  // REGISTER
  // =====================
  if (path === '/api/auth/register' && request.method === 'POST') {
    try {
      const { name, email, password } = await request.json();

      // Validate inputs
      if (!name || !email || !password) {
        return Response.json(
          { error: 'Name, email and password are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if email exists
      const existing = await env.DB.prepare(
        'SELECT id FROM parents WHERE email = ?'
      ).bind(email).first();

      if (existing) {
        return Response.json(
          { error: 'Email already registered' },
          { status: 409, headers: corsHeaders }
        );
      }

      // Hash password
      const password_hash = <PASSWORD_HASH_001> hashPassword(password);

      // Insert parent
      const result = await env.DB.prepare(
        'INSERT INTO parents (name, email, password_hash) VALUES (?, ?, ?)'
      ).bind(name, email, password_hash).run();

      // Generate token
      const token = await generateToken(
        { id: result.meta.last_row_id, email, name },
        env.JWT_SECRET
      );

      return Response.json(
        {
          message: 'Account created successfully! 🛡️',
          token,
          parent: { id: result.meta.last_row_id, name, email }
        },
        { status: 201, headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Registration failed' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // LOGIN
  // =====================
  if (path === '/api/auth/login' && request.method === 'POST') {
    try {
      const { email, password } = await request.json();

      // Validate inputs
      if (!email || !password) {
        return Response.json(
          { error: 'Email and password are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Find parent
      const parent = await env.DB.prepare(
        'SELECT * FROM parents WHERE email = ?'
      ).bind(email).first();

      if (!parent) {
        return Response.json(
          { error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Verify password
      const password_hash = <PASSWORD_HASH_001> hashPassword(password);
      if (password_hash !== parent.password_hash) {
        return Response.json(
          { error: 'Invalid email or password' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Generate token
      const token = await generateToken(
        { id: parent.id, email: parent.email, name: parent.name },
        env.JWT_SECRET
      );

      return Response.json(
        {
          message: 'Login successful! 👋',
          token,
          parent: { id: parent.id, name: parent.name, email: parent.email }
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Login failed' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return Response.json(
    { error: 'Route not found' },
    { status: 404, headers: corsHeaders }
  );
}

// Export verifyToken for use in other handlers
export { verifyToken };
