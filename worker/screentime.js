// KidGuard - Screen Time Handler
// Track and manage screen time usage

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

// Verify child belongs to parent
async function verifyChild(childId, parentId, env) {
  return await env.DB.prepare(
    'SELECT id, name, daily_limit_minutes FROM children WHERE id = ? AND parent_id = ?'
  ).bind(childId, parentId).first();
}

export async function handleScreenTime(request, env, corsHeaders) {
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
  // GET TODAY'S SCREEN TIME
  // =====================
  if (path.match(/^\/api\/screentime\/\d+\/today$/) && request.method === 'GET') {
    try {
      const childId = path.split('/')[3];

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const log = await env.DB.prepare(
        `SELECT 
          COALESCE(SUM(minutes_used), 0) as minutes_used,
          DATE('now') as date
        FROM screen_time_logs
        WHERE child_id = ? AND date = DATE('now')`
      ).bind(childId).first();

      const minutesUsed = log.minutes_used || 0;
      const limitMinutes = child.daily_limit_minutes;
      const remainingMinutes = Math.max(0, limitMinutes - minutesUsed);
      const percentageUsed = Math.min(100, Math.round((minutesUsed / limitMinutes) * 100));

      return Response.json(
        {
          child_id: parseInt(childId),
          child_name: child.name,
          date: log.date,
          minutes_used: minutesUsed,
          daily_limit_minutes: limitMinutes,
          remaining_minutes: remainingMinutes,
          percentage_used: percentageUsed,
          is_limit_reached: minutesUsed >= limitMinutes
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch screen time' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // GET WEEKLY REPORT
  // =====================
  if (path.match(/^\/api\/screentime\/\d+\/weekly$/) && request.method === 'GET') {
    try {
      const childId = path.split('/')[3];

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const logs = await env.DB.prepare(
        `SELECT 
          date,
          SUM(minutes_used) as minutes_used
        FROM screen_time_logs
        WHERE child_id = ? 
          AND date >= DATE('now', '-6 days')
        GROUP BY date
        ORDER BY date ASC`
      ).bind(childId).all();

      // Calculate weekly stats
      const totalMinutes = logs.results.reduce(
        (sum, log) => sum + log.minutes_used, 0
      );
      const avgMinutes = logs.results.length > 0
        ? Math.round(totalMinutes / logs.results.length)
        : 0;

      // Find day with most screen time
      const peakDay = logs.results.reduce(
        (max, log) => log.minutes_used > (max?.minutes_used || 0) ? log : max,
        null
      );

      return Response.json(
        {
          child_id: parseInt(childId),
          child_name: child.name,
          daily_limit_minutes: child.daily_limit_minutes,
          weekly_logs: logs.results,
          stats: {
            total_minutes: totalMinutes,
            average_daily_minutes: avgMinutes,
            peak_day: peakDay,
            days_within_limit: logs.results.filter(
              log => log.minutes_used <= child.daily_limit_minutes
            ).length
          }
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch weekly report' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // LOG SCREEN TIME
  // =====================
  if (path.match(/^\/api\/screentime\/\d+\/log$/) && request.method === 'POST') {
    try {
      const childId = path.split('/')[3];
      const { minutes_used } = await request.json();

      // Validate input
      if (!minutes_used || minutes_used < 1) {
        return Response.json(
          { error: 'Minutes used must be at least 1' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Check if log exists for today
      const existing = await env.DB.prepare(
        `SELECT id, minutes_used FROM screen_time_logs
        WHERE child_id = ? AND date = DATE('now')`
      ).bind(childId).first();

      if (existing) {
        // Update existing log
        await env.DB.prepare(
          `UPDATE screen_time_logs
          SET minutes_used = minutes_used + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE child_id = ? AND date = DATE('now')`
        ).bind(minutes_used, childId).run();
      } else {
        // Create new log
        await env.DB.prepare(
          `INSERT INTO screen_time_logs (child_id, date, minutes_used)
          VALUES (?, DATE('now'), ?)`
        ).bind(childId, minutes_used).run();
      }

      // Get updated total
      const updated = await env.DB.prepare(
        `SELECT COALESCE(SUM(minutes_used), 0) as total
        FROM screen_time_logs
        WHERE child_id = ? AND date = DATE('now')`
      ).bind(childId).first();

      const totalToday = updated.total;
      const limitReached = totalToday >= child.daily_limit_minutes;

      // Auto award points if within limit
      if (!limitReached) {
        await env.DB.prepare(
          `INSERT INTO points (child_id, points, reason)
          VALUES (?, 2, 'Stayed within screen time limit')`
        ).bind(childId).run();
      }

      return Response.json(
        {
          message: 'Screen time logged successfully ✅',
          child_name: child.name,
          minutes_logged: minutes_used,
          total_today: totalToday,
          daily_limit: child.daily_limit_minutes,
          remaining: Math.max(0, child.daily_limit_minutes - totalToday),
          limit_reached: limitReached,
          points_awarded: !limitReached ? 2 : 0
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to log screen time' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // UPDATE DAILY LIMIT
  // =====================
  if (path.match(/^\/api\/screentime\/\d+\/limit$/) && request.method === 'PUT') {
    try {
      const childId = path.split('/')[3];
      const { daily_limit_minutes } = await request.json();

      // Validate input
      if (!daily_limit_minutes || daily_limit_minutes < 15) {
        return Response.json(
          { error: 'Daily limit must be at least 15 minutes' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      await env.DB.prepare(
        'UPDATE children SET daily_limit_minutes = ? WHERE id = ? AND parent_id = ?'
      ).bind(daily_limit_minutes, childId, parent.id).run();

      return Response.json(
        {
          message: `Daily limit updated to ${daily_limit_minutes} minutes ✅`,
          child_name: child.name,
          daily_limit_minutes
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to update daily limit' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return Response.json(
    { error: 'Route not found' },
    { status: 404, headers: corsHeaders }
  );
}
