const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config({ path: '../.env' });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: '.env' });
}

const User = require('../models/User');
const AIAgent = require('../models/AIAgent');
const Contact = require('../models/Contact');
const Campaign = require('../models/Campaign');
const Call = require('../models/Call');
const Transcript = require('../models/Transcript');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Seeding demo data into database...');

    // Clear existing data for fresh seed
    await User.deleteMany({});
    await AIAgent.deleteMany({});
    await Contact.deleteMany({});
    await Campaign.deleteMany({});
    await Call.deleteMany({});
    await Transcript.deleteMany({});

    // 1. Create Demo User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      name: 'Demo Admin',
      email: 'demo@talkpilot.ai',
      password: hashedPassword,
      role: 'admin'
    });

    console.log(`Demo user created: ${user.email} (Password: password123)`);

    // 2. Create 2 AI Agents
    const agent1 = await AIAgent.create({
      userId: user._id,
      name: 'PIET Admissions Counselor',
      description: 'Persuasive AI counselor for Panipat Institute of Engineering and Technology (PIET) admissions.',
      systemInstructions:
        'You are TalkPilot, a friendly, persuasive admissions counselor from PIET (Panipat Institute of Engineering and Technology). Reply custom to each student, explain why they should join PIET, highlight our NAAC A+ rating, 38 LPA package, Apple lab, and up to 100% scholarships.',
      greetingMessage: 'Hi, this is TalkPilot from PIET, is this {name}?',
      personality: 'Warm & Persuasive',
      language: 'en-US',
      voice: 'en-US-Neural2-F (Female)',
      callObjective: 'Convince prospective students to join PIET and schedule admission counseling.',
      endingMessage: 'Thank you for your time! We look forward to seeing you at PIET. Have a wonderful day.',
      maxDuration: 300,
      totalCalls: 18,
      successRate: 94
    });

    const agent2 = await AIAgent.create({
      userId: user._id,
      name: 'Customer Feedback Agent',
      description: 'Collects feedback and ratings from recent service interactions.',
      systemInstructions:
        'You are a customer feedback survey agent. Ask the customer to rate their experience from 1 to 5. Record feedback gently and professionally.',
      greetingMessage: 'Hello! I am calling on behalf of TalkPilot AI to ask 2 quick questions about your recent service.',
      personality: 'Friendly & Casual',
      language: 'en-US',
      voice: 'en-US-Neural2-M (Male)',
      callObjective: 'Collect customer satisfaction rating and service feedback.',
      endingMessage: 'We deeply appreciate your feedback. Thank you and goodbye!',
      maxDuration: 180,
      totalCalls: 8,
      successRate: 85
    });

    console.log('Created 2 AI Agents.');

    // 3. Create 10 Contacts
    const rawContacts = [
      { name: 'Rahul Sharma', phone: '+919876543210', email: 'rahul@example.com', optOutStatus: false },
      { name: 'Aman Kumar', phone: '+918765432109', email: 'aman@example.com', optOutStatus: false },
      { name: 'Priya Patel', phone: '+919811223344', email: 'priya@example.com', optOutStatus: false },
      { name: 'David Miller', phone: '+14155550123', email: 'david@example.com', optOutStatus: false },
      { name: 'Sarah Jenkins', phone: '+14155550198', email: 'sarah@example.com', optOutStatus: false },
      { name: 'Vikram Singh', phone: '+919988776655', email: 'vikram@example.com', optOutStatus: false },
      { name: 'Neha Gupta', phone: '+919876001122', email: 'neha@example.com', optOutStatus: true }, // Opted Out
      { name: 'Michael Brown', phone: '+14155550777', email: 'michael@example.com', optOutStatus: false },
      { name: 'Emily Davis', phone: '+14155550888', email: 'emily@example.com', optOutStatus: false },
      { name: 'Rohan Mehta', phone: '+919765432100', email: 'rohan@example.com', optOutStatus: false }
    ];

    const contacts = [];
    for (const c of rawContacts) {
      const created = await Contact.create({
        userId: user._id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        tags: ['Demo', c.optOutStatus ? 'Opt-Out' : 'Verified'],
        consentStatus: true,
        optOutStatus: c.optOutStatus
      });
      contacts.push(created);
    }

    console.log('Created 10 Contacts.');

    // 4. Create 2 Campaigns
    const campaign1 = await Campaign.create({
      userId: user._id,
      name: 'Q3 Appointment Reminders',
      agentId: agent1._id,
      contactIds: contacts.slice(0, 5).map((c) => c._id),
      status: 'Completed',
      concurrencyLimit: 3,
      stats: {
        totalContacts: 5,
        queued: 0,
        calling: 0,
        completed: 4,
        failed: 0,
        noAnswer: 1,
        busy: 0,
        optedOut: 0
      }
    });

    const campaign2 = await Campaign.create({
      userId: user._id,
      name: 'August Customer Feedback Survey',
      agentId: agent2._id,
      contactIds: contacts.slice(5, 10).map((c) => c._id),
      status: 'Running',
      concurrencyLimit: 2,
      stats: {
        totalContacts: 5,
        queued: 2,
        calling: 1,
        completed: 1,
        failed: 0,
        noAnswer: 0,
        busy: 0,
        optedOut: 1
      }
    });

    console.log('Created 2 Campaigns.');

    // 5. Create Sample Calls & Transcripts
    const sampleCallsData = [
      {
        contact: contacts[0],
        agent: agent1,
        campaign: campaign1,
        status: 'Completed',
        duration: 42,
        outcome: 'Appointment Confirmed',
        summary: 'Customer Rahul confirmed his appointment scheduled for Thursday at 3:00 PM.',
        intent: 'Appointment Confirmation',
        actionRequired: 'Update CRM calendar',
        transcript: [
          { speaker: 'AI', text: 'Hello! This is TalkPilot AI calling to confirm your upcoming appointment.' },
          { speaker: 'Customer', text: 'Hi! Yes, I am Rahul. When is the appointment?' },
          { speaker: 'AI', text: 'Your appointment is set for Thursday at 3:00 PM.' },
          { speaker: 'Customer', text: 'Perfect, please confirm it. Thank you!' },
          { speaker: 'AI', text: 'Wonderful! Your appointment is confirmed. Have a great day!' }
        ]
      },
      {
        contact: contacts[1],
        agent: agent1,
        campaign: campaign1,
        status: 'Completed',
        duration: 35,
        outcome: 'Callback Requested',
        summary: 'Customer Aman requested a callback tomorrow afternoon.',
        intent: 'Reschedule / Callback',
        actionRequired: 'Set reminder to call Aman tomorrow at 2 PM',
        transcript: [
          { speaker: 'AI', text: 'Hello! This is TalkPilot AI calling to confirm your upcoming appointment.' },
          { speaker: 'Customer', text: 'I am in a meeting right now. Can you call me back later?' },
          { speaker: 'AI', text: 'No problem at all! I will note down a callback request for tomorrow afternoon.' },
          { speaker: 'Customer', text: 'Thanks, talk to you then.' }
        ]
      },
      {
        contact: contacts[6], // Neha Gupta (Opted out)
        agent: agent2,
        campaign: campaign2,
        status: 'Opted Out',
        duration: 15,
        outcome: 'Opted Out',
        summary: 'Customer Neha requested immediate opt-out from future campaign calls.',
        intent: 'Opt Out',
        actionRequired: 'Verify DNC registry status',
        transcript: [
          { speaker: 'AI', text: 'Hello! I am calling on behalf of TalkPilot AI to ask 2 quick questions.' },
          { speaker: 'Customer', text: 'Please stop calling me and remove me from your list.' },
          { speaker: 'AI', text: 'I understand completely. We have recorded your request to opt out. Have a good day.' }
        ]
      }
    ];

    for (const data of sampleCallsData) {
      const call = await Call.create({
        userId: user._id,
        campaignId: data.campaign._id,
        agentId: data.agent._id,
        contactId: data.contact._id,
        phone: data.contact.phone,
        status: data.status,
        callingMode: 'mock',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 3600000 + data.duration * 1000),
        duration: data.duration,
        outcome: data.outcome,
        summary: data.summary,
        intent: data.intent,
        actionRequired: data.actionRequired,
        recordingUrl: `https://talkpilot-mock-recordings.s3.amazonaws.com/demo_${data.contact._id}.mp3`
      });

      await Transcript.create({
        callId: call._id,
        messages: data.transcript
      });
    }

    console.log('Created Sample Calls and Transcripts successfully!');
    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedData();
