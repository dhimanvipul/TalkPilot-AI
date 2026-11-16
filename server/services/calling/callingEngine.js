const Call = require('../../models/Call');
const Contact = require('../../models/Contact');
const Campaign = require('../../models/Campaign');
const AIAgent = require('../../models/AIAgent');
const telephonyProvider = require('../telephony/telephonyProvider');

class CallingEngine {
  constructor() {
    this.activeCampaignJobs = new Map();
  }

  async startCampaignQueue(campaignId, io) {
    const campaign = await Campaign.findById(campaignId).populate('contactIds').populate('agentId');
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'Running';
    await campaign.save();

    if (io) {
      io.to(`user:${campaign.userId.toString()}`).emit('campaign:updated', {
        campaignId: campaign._id,
        status: 'Running',
        stats: campaign.stats
      });
    }

    // Spawn async campaign processor loop
    const jobState = { paused: false, stopped: false };
    this.activeCampaignJobs.set(campaignId.toString(), jobState);

    this.processCampaignQueue(campaign, jobState, io).catch((err) => {
      console.error(`Error processing campaign ${campaignId}:`, err);
    });

    return { success: true, message: 'Campaign queue started' };
  }

  async pauseCampaignQueue(campaignId, io) {
    const jobState = this.activeCampaignJobs.get(campaignId.toString());
    if (jobState) {
      jobState.paused = true;
    }
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = 'Paused';
      await campaign.save();
      if (io) {
        io.to(`user:${campaign.userId.toString()}`).emit('campaign:updated', {
          campaignId: campaign._id,
          status: 'Paused',
          stats: campaign.stats
        });
      }
    }
    return { success: true, message: 'Campaign paused' };
  }

  async resumeCampaignQueue(campaignId, io) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    return await this.startCampaignQueue(campaignId, io);
  }

  async stopCampaignQueue(campaignId, io) {
    const jobState = this.activeCampaignJobs.get(campaignId.toString());
    if (jobState) {
      jobState.stopped = true;
      this.activeCampaignJobs.delete(campaignId.toString());
    }
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = 'Cancelled';
      await campaign.save();
      if (io) {
        io.to(`user:${campaign.userId.toString()}`).emit('campaign:updated', {
          campaignId: campaign._id,
          status: 'Cancelled',
          stats: campaign.stats
        });
      }
    }
    return { success: true, message: 'Campaign stopped' };
  }

  async processCampaignQueue(campaign, jobState, io) {
    const contacts = campaign.contactIds || [];
    const agent = campaign.agentId;
    const userId = campaign.userId;

    campaign.stats.totalContacts = contacts.length;
    campaign.stats.queued = contacts.length;
    await campaign.save();

    for (const contact of contacts) {
      if (jobState.stopped) break;
      while (jobState.paused) {
        await new Promise((r) => setTimeout(r, 1000));
        if (jobState.stopped) break;
      }
      if (jobState.stopped) break;

      // Check 1: Opt-Out & Consent Check
      if (contact.optOutStatus || !contact.consentStatus) {
        console.log(`[CallingEngine] Skipping contact ${contact.phone} - OPTED OUT / NO CONSENT`);
        
        const skippedCall = new Call({
          userId,
          campaignId: campaign._id,
          agentId: agent._id,
          contactId: contact._id,
          phone: contact.phone,
          status: 'Opted Out',
          outcome: 'Opted Out',
          summary: 'Call skipped automatically by DNC protection system due to opt-out status.',
          callingMode: process.env.CALLING_MODE || 'mock'
        });
        await skippedCall.save();

        campaign.stats.queued = Math.max(0, campaign.stats.queued - 1);
        campaign.stats.optedOut = (campaign.stats.optedOut || 0) + 1;
        await campaign.save();

        if (io) {
          io.to(`user:${userId.toString()}`).emit('call:queued', {
            callId: skippedCall._id,
            status: 'Opted Out',
            phone: contact.phone
          });
          io.to(`user:${userId.toString()}`).emit('campaign:updated', {
            campaignId: campaign._id,
            status: campaign.status,
            stats: campaign.stats
          });
        }
        continue;
      }

      // Create new call record in Queued state
      const call = new Call({
        userId,
        campaignId: campaign._id,
        agentId: agent._id,
        contactId: contact._id,
        phone: contact.phone,
        status: 'Queued',
        callingMode: process.env.CALLING_MODE || 'mock'
      });
      await call.save();

      campaign.stats.queued = Math.max(0, campaign.stats.queued - 1);
      campaign.stats.calling = (campaign.stats.calling || 0) + 1;
      await campaign.save();

      if (io) {
        io.to(`user:${userId.toString()}`).emit('call:queued', {
          callId: call._id,
          status: 'Queued',
          phone: contact.phone
        });
      }

      try {
        await telephonyProvider.initiateCall({ call, agent, contact, campaign, io });
      } catch (err) {
        console.error(`Error initiating call to ${contact.phone}:`, err);
        call.status = 'Failed';
        call.outcome = 'Failed';
        call.lastError = err.message;
        call.summary = `Call failed to initiate: ${err.message}`;
        await call.save();

        campaign.stats.calling = Math.max(0, campaign.stats.calling - 1);
        campaign.stats.failed = (campaign.stats.failed || 0) + 1;

        if (io) {
          io.to(`user:${userId.toString()}`).emit('call:error', {
            callId: call._id,
            message: err.message
          });
        }
      }

      await campaign.save();
      if (io) {
        io.to(`user:${userId.toString()}`).emit('campaign:updated', {
          campaignId: campaign._id,
          status: campaign.status,
          stats: campaign.stats
        });
      }

      // Interval delay between queue dispatches
      const delayMs = (campaign.callInterval || 3) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!jobState.stopped && !jobState.paused) {
      campaign.status = 'Completed';
      await campaign.save();
      if (io) {
        io.to(`user:${userId.toString()}`).emit('campaign:updated', {
          campaignId: campaign._id,
          status: 'Completed',
          stats: campaign.stats
        });
      }
    }

    this.activeCampaignJobs.delete(campaign._id.toString());
  }
}

module.exports = new CallingEngine();
