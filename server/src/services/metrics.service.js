const db = require('../config/database');

class MetricsService {
  /**
   * Returns time-series throughput data bucketed by minute.
   * Chart-ready: [{ time: '12:05', count: 3 }, ...]
   */
  async getThroughput(timeframe = '1h') {
    const hours = parseInt(timeframe, 10) || 1;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const rows = await db.raw(`
      SELECT 
        to_char(date_trunc('minute', completed_at), 'HH24:MI') as time,
        COUNT(*) as count
      FROM jobs
      WHERE status = 'completed'
        AND completed_at >= ?
      GROUP BY date_trunc('minute', completed_at)
      ORDER BY date_trunc('minute', completed_at) ASC
    `, [since]);

    return rows.rows.map(r => ({
      time: r.time,
      count: parseInt(r.count, 10)
    }));
  }

  /**
   * Returns time-series error data bucketed by minute.
   * Chart-ready: [{ time: '12:05', errors: 1, completed: 5 }, ...]
   */
  async getErrorRate(timeframe = '1h') {
    const hours = parseInt(timeframe, 10) || 1;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await db.raw(`
      SELECT 
        to_char(date_trunc('minute', updated_at), 'HH24:MI') as time,
        COUNT(*) FILTER (WHERE status = 'failed') as errors,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total
      FROM jobs
      WHERE updated_at >= ?
        AND status IN ('completed', 'failed')
      GROUP BY date_trunc('minute', updated_at)
      ORDER BY date_trunc('minute', updated_at) ASC
    `, [since]);

    // Also return an aggregate summary
    const totals = rows.rows.reduce((acc, r) => {
      acc.total += parseInt(r.total, 10);
      acc.failed += parseInt(r.errors, 10);
      acc.completed += parseInt(r.completed, 10);
      return acc;
    }, { total: 0, failed: 0, completed: 0 });

    return {
      timeSeries: rows.rows.map(r => ({
        time: r.time,
        errors: parseInt(r.errors, 10),
        completed: parseInt(r.completed, 10)
      })),
      summary: {
        ...totals,
        rate: totals.total > 0 ? ((totals.failed / totals.total) * 100).toFixed(1) : '0.0'
      }
    };
  }

  async getWorkerUtilization() {
    const workers = await db('workers')
      .select('id', 'hostname', 'status', 'concurrency_slots', 'active_jobs', 'last_heartbeat_at', 'metadata');
    return workers;
  }

  /**
   * System-wide overview for the dashboard stat cards.
   */
  async getSystemOverview() {
    const queueStats = await db.raw(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_queues,
        COUNT(*) as total_queues,
        COALESCE(SUM(total_processed), 0) as total_processed,
        COALESCE(SUM(total_failed), 0) as total_failed
      FROM queues
    `);

    const workerStats = await db.raw(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('online', 'busy')) as online_workers,
        COUNT(*) as total_workers
      FROM workers
    `);

    const jobStats = await db.raw(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
      FROM jobs
    `);

    const dlqStats = await db.raw(`
      SELECT COUNT(*) FILTER (WHERE resolution_status = 'pending') as pending_dlq
      FROM dead_letter_queue
    `);

    const recentJobs = await db.raw(`
      SELECT 
        COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '1 hour') as last_hour,
        COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '2 hours' AND completed_at < NOW() - INTERVAL '1 hour') as prev_hour
      FROM jobs
      WHERE status = 'completed'
    `);

    const row = { ...queueStats.rows[0], ...workerStats.rows[0], ...jobStats.rows[0], ...dlqStats.rows[0] };

    const currentHr = parseInt(recentJobs.rows[0]?.last_hour || 0);
    const prevHr = parseInt(recentJobs.rows[0]?.prev_hour || 0);
    let trendValue = 0;
    if (prevHr === 0) {
      trendValue = currentHr > 0 ? 100 : 0; 
    } else {
      trendValue = ((currentHr - prevHr) / prevHr) * 100;
    }
    const processedTrend = `${Math.abs(trendValue).toFixed(1)}%`;
    const processedTrendUp = trendValue >= 0;

    const totalFinished = parseInt(row.completed_jobs || 0) + parseInt(row.failed_jobs || 0);
    const successRate = totalFinished > 0
      ? ((parseInt(row.completed_jobs || 0) / totalFinished) * 100).toFixed(1)
      : '100.0';

    return {
      activeQueues: parseInt(row.active_queues || 0),
      totalQueues: parseInt(row.total_queues || 0),
      onlineWorkers: parseInt(row.online_workers || 0),
      totalWorkers: parseInt(row.total_workers || 0),
      runningJobs: parseInt(row.running_jobs || 0),
      queuedJobs: parseInt(row.queued_jobs || 0),
      completedJobs: parseInt(row.completed_jobs || 0),
      failedJobs: parseInt(row.failed_jobs || 0),
      totalProcessed: parseInt(row.total_processed || 0),
      processedTrend,
      processedTrendUp,
      totalFailed: parseInt(row.total_failed || 0),
      pendingDLQ: parseInt(row.pending_dlq || 0),
      successRate
    };
  }

  /**
   * Recent job activity feed for the dashboard.
   */
  async getRecentActivity(limit = 20) {
    const activities = await db('jobs')
      .select('id', 'type', 'status', 'queue_id', 'updated_at', 'claimed_by_worker')
      .whereIn('status', ['completed', 'failed', 'running'])
      .orderBy('updated_at', 'desc')
      .limit(limit);
    
    return activities;
  }
}

module.exports = new MetricsService();
