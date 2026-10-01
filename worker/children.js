// KidGuard - Children Handler
// Manage kids profiles

import { verifyToken } from './auth';

// Authenticate request helper
async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return await verifyToken(token, env.JWT_SECRET);
}

export async function handleChildren(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Verify JWT token
  const parent = await authenticate(request, env);
  if (!parent) {
    return Response.json(
      { error: 'Unauthorized. Please login.' },
      { status: 401, headers: corsHeaders }
    );
  }

  // =====================
  // GET ALL CHILDREN
  // =====================
  if (path === '/api/children' && request.method === 'GET') {
    try {
      const children = await env.DB.prepare(
        `SELECT 
          c.id,
          c.name,
          c.age,
          c.avatar,
          c.daily_limit_minutes,
          c.created_at,
          COALESCE(SUM(s.minutes_used), 0) as today_minutes
        FROM children c
        LEFT JOIN screen_time_logs s 
          ON c.id = s.child_id 
          AND s.date = DATE('now')
        WHERE c.parent_id = ?
        GROUP BY c.id`
      ).bind(parent.id).all();

      return Response.json(
        { children: children.results },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch children' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // GET SINGLE CHILD
  // =====================
  if (path.match(/^\/api\/children\/\d+$/) && request.method === 'GET') {
    try {
      const childId = path.split('/')[3];

      const child = await env.DB.prepare(
        `SELECT 
          c.id,
          c.name,
          c.age,
          c.avatar,
          c.daily_limit_minutes,
          c.created_at,
          COALESCE(SUM(s.minutes_used), 0) as today_minutes
        FROM children c
        LEFT JOIN screen_time_logs s 
          ON c.id = s.child_id 
          AND s.date = DATE('now')
        WHERE c.id = ? AND c.parent_id = ?
        GROUP BY c.id`
      ).bind(childId, parent.id).first();

      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      return Response.json(
        { child },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch child' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // ADD CHILD
  // =====================
  if (path === '/api/children' && request.method === 'POST') {
    try {
      const { name, age, avatar, daily_limit_minutes } = await request.json();

      // Validate inputs
      if (!name || !age) {
        return Response.json(
          { error: 'Name and age are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (age < 1 || age > 17) {
        return Response.json(
          { error: 'Age must be between 1 and 17' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await env.DB.prepare(
        `INSERT INTO children 
          (parent_id, name, age, avatar, daily_limit_minutes) 
        VALUES (?, ?, ?, ?, ?)`
      ).bind(
        parent.id,
        name,
        age,
        avatar || 'default',
        daily_limit_minutes || 120
      ).run();

      return Response.json(
        {
          message: `${name} added successfully! 🧒`,
          child: {
            id: result.meta.last_row_id,
            name,
            age,
            avatar: avatar || 'default',
            daily_limit_minutes: daily_limit_minutes || 120
          }
        },
        { status: 201, headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to add child' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // UPDATE CHILD
  // =====================
  if (path.match(/^\/api\/children\/\d+$/) && request.method === 'PUT') {
    try {
      const childId = path.split('/')[3];
      const { name, age, avatar, daily_limit_minutes } = await request.json();

      // Check child belongs to parent
      const existing = await env.DB.prepare(
        'SELECT id FROM children WHERE id = ? AND parent_id = ?'
      ).bind(childId, parent.id).first();

      if (!existing) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      await env.DB.prepare(
        `UPDATE children 
        SET name = COALESCE(?, name),
            age = COALESCE(?, age),
            avatar = COALESCE(?, avatar),
            daily_limit_minutes = COALESCE(?, daily_limit_minutes)
        WHERE id = ? AND parent_id = ?`
      ).bind(
        name, age, avatar,
        daily_limit_minutes,
        childId, parent.id
      ).run();

      return Response.json(
        { message: 'Child updated successfully! ✅' },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to update child' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // DELETE CHILD
  // =====================
  if (path.match(/^\/api\/children\/\d+$/) && request.method === 'DELETE') {
    try {
      const childId = path.split('/')[3];

      // Check child belongs to parent
      const existing = await env.DB.prepare(
        'SELECT id, name FROM children WHERE id = ? AND parent_id = ?'
      ).bind(childId, parent.id).first();

      if (!existing) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      await env.DB.prepare(
        'DELETE FROM children WHERE id = ? AND parent_id = ?'
      ).bind(childId, parent.id).run();

      return Response.json(
        { message: `${existing.name} removed successfully` },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to delete child' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return Response.json(
    { error: 'Route not found' },
    { status: 404, headers: corsHeaders }
  );
  }
