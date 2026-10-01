// KidGuard - Rewards Handler
// Manage rewards and points system

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
    'SELECT id, name FROM children WHERE id = ? AND parent_id = ?'
  ).bind(childId, parentId).first();
}

// Get total points for a child
async function getTotalPoints(childId, env) {
  const result = await env.DB.prepare(
    'SELECT COALESCE(SUM(points), 0) as total FROM points WHERE child_id = ?'
  ).bind(childId).first();
  return result.total || 0;
}

export async function handleRewards(request, env, corsHeaders) {
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
  // GET CHILD'S POINTS
  // =====================
  if (path.match(/^\/api\/rewards\/\d+\/points$/) && request.method === 'GET') {
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

      // Get total points
      const totalPoints = await getTotalPoints(childId, env);

      // Get points history
      const history = await env.DB.prepare(
        `SELECT points, reason, created_at
        FROM points
        WHERE child_id = ?
        ORDER BY created_at DESC
        LIMIT 20`
      ).bind(childId).all();

      return Response.json(
        {
          child_id: parseInt(childId),
          child_name: child.name,
          total_points: totalPoints,
          history: history.results
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch points' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // ADD POINTS MANUALLY
  // =====================
  if (path.match(/^\/api\/rewards\/\d+\/points$/) && request.method === 'POST') {
    try {
      const childId = path.split('/')[3];
      const { points, reason } = await request.json();

      // Validate input
      if (!points || points < 1) {
        return Response.json(
          { error: 'Points must be at least 1' },
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

      // Add points
      await env.DB.prepare(
        'INSERT INTO points (child_id, points, reason) VALUES (?, ?, ?)'
      ).bind(childId, points, reason || 'Bonus points from parent 🎉').run();

      // Get new total
      const totalPoints = await getTotalPoints(childId, env);

      return Response.json(
        {
          message: `${points} points added to ${child.name}! 🌟`,
          child_name: child.name,
          points_added: points,
          total_points: totalPoints
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to add points' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // GET ALL REWARDS
  // =====================
  if (path.match(/^\/api\/rewards\/\d+$/) && request.method === 'GET') {
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

      const rewards = await env.DB.prepare(
        `SELECT id, title, description, points_required, is_claimed, created_at
        FROM rewards
        WHERE child_id = ?
        ORDER BY is_claimed ASC, points_required ASC`
      ).bind(childId).all();

      // Get total points
      const totalPoints = await getTotalPoints(childId, env);

      return Response.json(
        {
          child_id: parseInt(childId),
          child_name: child.name,
          total_points: totalPoints,
          rewards: rewards.results
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to fetch rewards' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // CREATE REWARD
  // =====================
  if (path.match(/^\/api\/rewards\/\d+$/) && request.method === 'POST') {
    try {
      const childId = path.split('/')[3];
      const { title, description, points_required } = await request.json();

      // Validate input
      if (!title || !points_required) {
        return Response.json(
          { error: 'Title and points required are mandatory' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (points_required < 1) {
        return Response.json(
          { error: 'Points required must be at least 1' },
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

      const result = await env.DB.prepare(
        `INSERT INTO rewards (child_id, title, description, points_required)
        VALUES (?, ?, ?, ?)`
      ).bind(childId, title, description || '', points_required).run();

      return Response.json(
        {
          message: `Reward "${title}" created for ${child.name}! 🎁`,
          reward: {
            id: result.meta.last_row_id,
            child_id: parseInt(childId),
            title,
            description: description || '',
            points_required,
            is_claimed: 0
          }
        },
        { status: 201, headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to create reward' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // CLAIM REWARD
  // =====================
  if (path.match(/^\/api\/rewards\/\d+\/claim\/\d+$/) && request.method === 'POST') {
    try {
      const childId = path.split('/')[3];
      const rewardId = path.split('/')[5];

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      // Get reward
      const reward = await env.DB.prepare(
        'SELECT * FROM rewards WHERE id = ? AND child_id = ?'
      ).bind(rewardId, childId).first();

      if (!reward) {
        return Response.json(
          { error: 'Reward not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      if (reward.is_claimed) {
        return Response.json(
          { error: 'Reward already claimed' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Check if child has enough points
      const totalPoints = await getTotalPoints(childId, env);
      if (totalPoints < reward.points_required) {
        return Response.json(
          {
            error: `Not enough points! Need ${reward.points_required}, have ${totalPoints}`,
            total_points: totalPoints,
            points_required: reward.points_required,
            points_needed: reward.points_required - totalPoints
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Deduct points
      await env.DB.prepare(
        'INSERT INTO points (child_id, points, reason) VALUES (?, ?, ?)'
      ).bind(childId, -reward.points_required, `Claimed reward: ${reward.title}`).run();

      // Mark reward as claimed
      await env.DB.prepare(
        'UPDATE rewards SET is_claimed = 1 WHERE id = ?'
      ).bind(rewardId).run();

      // Get new total points
      const newTotal = await getTotalPoints(childId, env);

      return Response.json(
        {
          message: `🎉 ${child.name} claimed "${reward.title}"!`,
          child_name: child.name,
          reward_title: reward.title,
          points_spent: reward.points_required,
          remaining_points: newTotal
        },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to claim reward' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  // =====================
  // DELETE REWARD
  // =====================
  if (path.match(/^\/api\/rewards\/\d+\/delete\/\d+$/) && request.method === 'DELETE') {
    try {
      const childId = path.split('/')[3];
      const rewardId = path.split('/')[5];

      // Verify child belongs to parent
      const child = await verifyChild(childId, parent.id, env);
      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      const reward = await env.DB.prepare(
        'SELECT id, title FROM rewards WHERE id = ? AND child_id = ?'
      ).bind(rewardId, childId).first();

      if (!reward) {
        return Response.json(
          { error: 'Reward not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      await env.DB.prepare(
        'DELETE FROM rewards WHERE id = ?'
      ).bind(rewardId).run();

      return Response.json(
        { message: `Reward "${reward.title}" deleted successfully` },
        { headers: corsHeaders }
      );

    } catch (error) {
      return Response.json(
        { error: 'Failed to delete reward' },
        { status: 500, headers: corsHeaders }
      );
    }
  }

  return Response.json(
    { error: 'Route not found' },
    { status: 404, headers: corsHeaders }
  );
  }
