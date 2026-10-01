// KidGuard - Cloudflare Worker
// Main Router

import { handleAuth } from './auth';
import { handleChildren } from './children';
import { handleScreenTime } from './screentime';
import { handleRewards } from './rewards';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Auth routes
      if (path.startsWith('/api/auth')) {
        return await handleAuth(request, env, corsHeaders);
      }

      // Children routes
      if (path.startsWith('/api/children')) {
        return await handleChildren(request, env, corsHeaders);
      }

      // Screen time routes
      if (path.startsWith('/api/screentime')) {
        return await handleScreenTime(request, env, corsHeaders);
      }

      // Rewards routes
      if (path.startsWith('/api/rewards')) {
        return await handleRewards(request, env, corsHeaders);
      }

      // Health check
      if (path === '/api/health') {
        return Response.json(
          { status: 'KidGuard API is running! 🛡️' },
          { headers: corsHeaders }
        );
      }

      // 404
      return Response.json(
        { error: 'Route not found' },
        { status: 404, headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Internal server error' },
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
