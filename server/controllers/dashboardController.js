const mongoose = require('mongoose');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const Campaign = require('../models/Campaign');

// Helper: Format seconds → MM:SS
const formatDuration = (sec) => {
  const s = Math.round(sec || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper: Build the userId match — accepts both ObjectId and string forms.
// Uses $or to cover calls where user is CALLER (userId) OR RECIPIENT (recipientUserId / recipientEmail).
const buildUserCallMatch = (user) => {
  const conditions = [{ userId: user._id }];
  if (user._id) conditions.push({ recipientUserId: user._id });
  if (user.email) conditions.push({ recipientEmail: user.email.toLowerCase().trim() });
  return { $or: conditions };
};

// GET /api/dashboard/stats?range=7|30|all
const getStats = async (req, res) => {
  try {
    const user = req.user;
    const range = req.query.range || '7'; // '7', '30', 'all'

    const userMatch = buildUserCallMatch(user);

    // Date boundary
    let dateFilter = {};
    if (range !== 'all') {
      const days = parseInt(range, 10) || 7;
      const since = new Date();
      since.setDate(since.getDate() - (days - 1));
      since.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: since } };
    }

    const rangedMatch = { ...userMatch, ...dateFilter };

    // ── Core Counts (all-time for the stat cards) ──
    const [totalCalls, completedCalls, activeCalls, totalContacts] = await Promise.all([
      Call.countDocuments(userMatch),
      Call.countDocuments({ ...userMatch, status: 'Completed' }),
      Call.countDocuments({
        ...userMatch,
        status: { $in: ['Queued', 'Initiating', 'Ringing', 'Connected', 'In Progress'] }
      }),
      Contact.countDocuments({ userId: user._id })
    ]);

    // ── Success Rate ──
    const successOutcomes = ['Appointment Confirmed', 'Interested', 'Completed'];
    const [successfulCalls, eligibleCalls] = await Promise.all([
      Call.countDocuments({ ...userMatch, outcome: { $in: successOutcomes } }),
      Call.countDocuments({
        ...userMatch,
        status: { $in: ['Completed', 'Opted Out', 'No Answer', 'Busy', 'Failed', 'Cancelled'] }
      })
    ]);
    const successRate = eligibleCalls > 0 ? Math.round((successfulCalls / eligibleCalls) * 100) : 0;

    // ── Average Duration ──
    const durationAgg = await Call.aggregate([
      { $match: { ...userMatch, status: 'Completed', duration: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);
    const avgDurationSeconds = durationAgg.length > 0 ? Math.round(durationAgg[0].avgDuration) : 0;

    // ── Call Status Breakdown (all-time) ──
    const statusAgg = await Call.aggregate([
      { $match: userMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── Calls By Day for selected range ──
    const numDays = range === 'all' ? 30 : parseInt(range, 10);
    const sinceForChart = new Date();
    sinceForChart.setDate(sinceForChart.getDate() - (numDays - 1));
    sinceForChart.setHours(0, 0, 0, 0);

    const callsByDayRaw = await Call.aggregate([
      { $match: { ...userMatch, createdAt: { $gte: sinceForChart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          failed: {
            $sum: {
              $cond: [{ $in: ['$status', ['Failed', 'No Answer', 'Busy', 'Cancelled']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map results by UTC date string
    const dayMap = {};
    for (const d of callsByDayRaw) {
      dayMap[d._id] = { calls: d.total, completed: d.completed, failed: d.failed };
    }

    // Build full day array (fill gaps with zeros)
    const callsByDay = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // UTC key (matches $dateToString UTC output)
      const utcKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      // Display label
      const label =
        numDays <= 7
          ? d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      callsByDay.push({
        date: label,
        calls: dayMap[utcKey]?.calls || 0,
        completed: dayMap[utcKey]?.completed || 0,
        failed: dayMap[utcKey]?.failed || 0
      });
    }

    // ── Campaign Performance (live from Call records + contact counts) ──
    const campaigns = await Campaign.find({ userId: user._id })
      .select('name stats contactIds')
      .limit(8);

    const campaignIds = campaigns.map((c) => c._id);

    const campCallAgg = await Call.aggregate([
      { $match: { ...userMatch, campaignId: { $in: campaignIds } } },
      {
        $group: {
          _id: '$campaignId',
          totalCalls: { $sum: 1 },
          completedCalls: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          failedCalls: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Failed', 'No Answer', 'Busy', 'Cancelled', 'Opted Out']] },
                1,
                0
              ]
            }
          },
          calledContactIds: { $addToSet: '$contactId' }
        }
      }
    ]);

    const campMap = {};
    for (const c of campCallAgg) {
      campMap[c._id.toString()] = c;
    }

    const campaignPerformance = campaigns.map((c) => {
      const liveData = campMap[c._id.toString()];
      const totalContacts = c.contactIds?.length || c.stats?.totalContacts || 0;
      const calledCount = liveData?.calledContactIds?.length || 0;
      const completedCalls = liveData?.completedCalls || 0;
      const failedCalls = liveData?.failedCalls || 0;
      const notCalled = Math.max(0, totalContacts - calledCount);
      const successRateCamp =
        calledCount > 0 ? Math.round((completedCalls / calledCount) * 100) : 0;

      return {
        name: c.name.length > 15 ? c.name.substring(0, 15) + '…' : c.name,
        fullName: c.name,
        total: totalContacts,
        called: calledCount,
        notCalled,
        completed: completedCalls,
        failed: failedCalls,
        successRate: successRateCamp
      };
    });

    // ── Build callStatusBreakdown with "Not Called" count ──
    const callStatusBreakdown = statusAgg.map((s) => ({ name: s._id, value: s.count }));

    // Add "Not Called" across all campaigns (contacts never called by this user)
    const totalCampaignContacts = campaigns.reduce((sum, c) => sum + (c.contactIds?.length || 0), 0);
    const calledAgg = await Call.aggregate([
      { $match: userMatch },
      { $group: { _id: '$contactId' } },
      { $count: 'uniqueCalled' }
    ]);
    const uniqueCalledContacts = calledAgg[0]?.uniqueCalled || 0;
    const notCalledContacts = Math.max(0, totalContacts - uniqueCalledContacts);
    if (notCalledContacts > 0) {
      callStatusBreakdown.push({ name: 'Not Called', value: notCalledContacts });
    }

    res.json({
      success: true,
      range,
      stats: {
        totalCalls,
        completedCalls,
        activeCalls,
        successRate,
        avgDuration: formatDuration(avgDurationSeconds),
        avgDurationSeconds,
        totalContacts,
        calledContacts: uniqueCalledContacts,
        notCalledContacts
      },
      callStatusBreakdown,
      callsByDay,
      campaignPerformance
    });
  } catch (err) {
    console.error('[dashboardController] getStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/dashboard/recent-calls
const getRecentCalls = async (req, res) => {
  try {
    const user = req.user;
    const userMatch = buildUserCallMatch(user);

    const recentCalls = await Call.find(userMatch)
      .populate('contactId', 'name phone email')
      .populate('agentId', 'name')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, calls: recentCalls });
  } catch (err) {
    console.error('[dashboardController] getRecentCalls error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, getRecentCalls };
