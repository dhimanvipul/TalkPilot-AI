/**
 * AI Engine for TalkPilot AI
 * Dynamic, Conversational Dialogue Engine
 * Supports multi-campaign execution: PIET Admissions, Diwali Party, Customer Support,
 * and any custom campaign with natural human-like spoken dialogue and real-time custom responses.
 */

const freeAiClient = require('./freeAiClient');

class AIEngine {
  constructor() {
    this.variationIndex = new Map();
  }

  /**
   * Resolves dynamic campaign configuration, merging Campaign and Agent settings.
   */
  resolveCampaignConfig({ campaign, agent, contact }) {
    const rawContactName = contact?.name || '';
    const cleanContactName = rawContactName.trim().replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '');
    const contactFirstName = cleanContactName.split(' ')[0] || cleanContactName || 'there';

    const campaignName = campaign?.name?.trim() || agent?.name?.trim() || 'TalkPilot Voice Campaign';
    const lowerCamp = campaignName.toLowerCase();
    const lowerAgentName = (agent?.name || '').toLowerCase();

    const isPIET = lowerCamp.includes('piet') || (lowerAgentName.includes('piet') && !campaign?.name);
    const isDiwali = lowerCamp.includes('diwali') || lowerAgentName.includes('diwali');

    // 1. Objective
    let objective = campaign?.campaignObjective?.trim();
    if (!objective) {
      if (isDiwali) {
        objective = 'Invite guests to the Diwali Party celebration, explain event details, answer questions, and confirm attendance.';
      } else if (isPIET) {
        objective = agent?.callObjective?.trim() || 'PIET College Admissions Counseling';
      } else if (agent?.callObjective?.trim() && !lowerAgentName.includes('piet')) {
        objective = agent.callObjective.trim();
      } else {
        objective = `Conduct an engaging and helpful outreach call for ${campaignName}.`;
      }
    }

    // 2. Role / Personality
    let roleOrPersonality = campaign?.agentRole?.trim();
    if (!roleOrPersonality) {
      if (isDiwali) {
        roleOrPersonality = 'Diwali Party Invitation Assistant - warm, joyful, festive, and welcoming';
      } else if (isPIET) {
        roleOrPersonality = agent?.personality?.trim() || 'Warm & Persuasive Admissions Counselor';
      } else if (agent?.personality?.trim() && !lowerAgentName.includes('piet')) {
        roleOrPersonality = agent.personality.trim();
      } else {
        roleOrPersonality = 'Friendly, Professional, and Helpful Voice Assistant';
      }
    }

    // 3. Instructions
    let instructions = campaign?.systemInstructions?.trim();
    if (!instructions) {
      if (isDiwali) {
        instructions =
          'You are the Diwali Party Invitation Assistant. Introduce the upcoming Diwali party celebration, share festive greetings, explain that there will be music, traditional dinner, sweets, and celebration, ask if the guest is interested in attending, answer their questions about venue, time, food, and dress code, and confirm their RSVP attendance.';
      } else if (isPIET) {
        instructions =
          agent?.systemInstructions?.trim() ||
          'You are TalkPilot, a friendly, persuasive admissions counselor from PIET (Panipat Institute of Engineering and Technology). Reply custom to each student, explain why they should join PIET, highlight our NAAC A+ rating, 38 LPA package, Apple lab, and up to 100% scholarships.';
      } else if (agent?.systemInstructions?.trim() && !lowerAgentName.includes('piet')) {
        instructions = agent.systemInstructions.trim();
      } else {
        instructions = `You are the AI voice assistant for ${campaignName}. Speak politely, explain the purpose of the call clearly, answer customer questions accurately, and guide the user toward the objective: ${objective}.`;
      }
    }

    // 4. Context Info / Knowledge
    let contextInfo = campaign?.contextInfo?.trim();
    if (!contextInfo) {
      if (isDiwali) {
        contextInfo =
          'Event: Grand Diwali Celebration Party. Features: Traditional dinner buffet, festive sweets, live music, photo booths, fireworks, and family entertainment. Timing: 6:30 PM onwards this festival weekend. Venue: Grand Celebration Hall. Dress code: Traditional / Festive attire.';
      } else if (isPIET) {
        contextInfo =
          'NAAC A+ accredited premier engineering and management institute in Delhi-NCR (Samalkha, GT Road NH-44). Highest package ₹38 LPA, average 5-6 LPA; 350+ marquee recruiters including Amazon, Microsoft, Infosys, TCS. Apple Authorized iOS Lab, AICTE IDEA Lab, up to 100% PIET Quest scholarships.';
      } else {
        contextInfo = agent?.description?.trim() || '';
      }
    }

    // 5. Agent Name
    let agentName = agent?.name?.trim();
    if (!agentName || (isDiwali && agentName.toLowerCase().includes('piet'))) {
      agentName = isDiwali ? 'Diwali Party Assistant' : `${campaignName} Assistant`;
    }

    return {
      contactName: contactFirstName,
      fullName: cleanContactName,
      campaignName,
      objective,
      instructions,
      contextInfo,
      roleOrPersonality,
      agentName,
      isPIET,
      isDiwali
    };
  }

  /**
   * Generates dynamic campaign-aware greeting message.
   */
  generateGreeting({ contact, agent, campaign }) {
    const config = this.resolveCampaignConfig({ campaign, agent, contact });
    const name = config.contactName;

    // 1. Check custom greeting message on Campaign or Agent
    let customGreeting = campaign?.greetingMessage?.trim();
    if (!customGreeting && agent?.greetingMessage?.trim() && (config.isPIET || !config.isDiwali)) {
      customGreeting = agent.greetingMessage.trim();
    }

    if (customGreeting) {
      const formatted = customGreeting
        .replace(/\{name\}/gi, name)
        .replace(/\{contactName\}/gi, name)
        .replace(/\{firstName\}/gi, name)
        .replace(/\{campaignName\}/gi, config.campaignName);
      return formatted;
    }

    // 2. Diwali Party greeting
    if (config.isDiwali) {
      if (name && name.toLowerCase() !== 'there' && name.toLowerCase() !== 'contact') {
        return `Hi ${name}! Wishing you a joyful festive season. I am calling with an invitation to our Diwali Party celebration, is this ${name}?`;
      }
      return `Hi, wishing you a happy festive season! I am calling with an invitation to our Diwali Party celebration. Do you have a moment to speak?`;
    }

    // 3. PIET Admissions greeting (backward compatible)
    if (config.isPIET) {
      if (name && name.toLowerCase() !== 'there' && name.toLowerCase() !== 'student') {
        return `Hi, this is TalkPilot from PIET, is this ${name}?`;
      }
      return `Hi, this is TalkPilot from PIET, who am I speaking with?`;
    }

    // 4. General campaign greeting
    if (name && name.toLowerCase() !== 'there' && name.toLowerCase() !== 'contact') {
      return `Hello ${name}! This is ${config.agentName} calling regarding ${config.campaignName}, is this ${name}?`;
    }
    return `Hello! This is ${config.agentName} calling regarding ${config.campaignName}. How are you doing today?`;
  }

  /**
   * Backward compatibility wrapper for PIET greeting
   */
  getPIETGreeting(contact, agent) {
    return this.generateGreeting({ contact, agent, campaign: null });
  }

  /**
   * Dynamic turn-by-turn conversation processing for ANY campaign
   * Uses real AI API to genuinely respond like an intelligent human voice assistant.
   */
  async processConversation({ call, customerMessage, conversationHistory = [], agent, contact, campaign }) {
    let campaignObj = campaign;
    if (!campaignObj && call?.campaignId) {
      if (typeof call.campaignId === 'object' && call.campaignId.name) {
        campaignObj = call.campaignId;
      }
    }

    const config = this.resolveCampaignConfig({ campaign: campaignObj, agent, contact });
    const contactName = config.contactName;

    const input = (customerMessage || '').trim();
    const lowerInput = input.toLowerCase();

    // 1. Universal Opt-Out / Do Not Call Check
    if (
      lowerInput.includes('stop calling') ||
      lowerInput.includes('remove me') ||
      lowerInput.includes('remove my number') ||
      lowerInput.includes('opt out') ||
      lowerInput.includes('do not call') ||
      lowerInput.includes('dont call') ||
      lowerInput.includes('wrong number')
    ) {
      return {
        text: `I understand completely, ${contactName}. I have marked your preference and we will not call this number again. Thank you and have a wonderful day!`,
        isOptOut: true,
        shouldEndCall: true,
        intent: 'Opt Out'
      };
    }

    // 2. Universal Callback Request / Busy Check
    if (
      lowerInput.includes('call back later') ||
      lowerInput.includes('busy now') ||
      lowerInput.includes('busy right now') ||
      lowerInput.includes('in a meeting') ||
      lowerInput.includes('in class') ||
      lowerInput.includes('call later') ||
      lowerInput.includes('not a good time')
    ) {
      return {
        text: `No problem at all, ${contactName}! We totally respect your time. When would be a convenient time for us to give you a quick callback?`,
        isCallback: true,
        shouldEndCall: false,
        intent: 'Callback Requested'
      };
    }

    // 3. User says Goodbye / That is all / Thank you
    if (
      (lowerInput.includes('bye') ||
        lowerInput.includes('goodbye') ||
        lowerInput.includes('nothing else') ||
        lowerInput.includes('that is all') ||
        lowerInput.includes('thats all') ||
        lowerInput.includes('no thats it') ||
        lowerInput.includes('no that is it')) &&
      conversationHistory.length >= 3
    ) {
      const farewell =
        agent?.endingMessage && !agent.endingMessage.includes('PIET')
          ? agent.endingMessage
          : `Thank you so much for your time, ${contactName}! Have a wonderful day ahead!`;
      return {
        text: farewell,
        shouldEndCall: true,
        intent: 'Call Concluded'
      };
    }

    // 4. Construct Dynamic Campaign System Prompt for the AI API
    const systemPrompt = `You are ${config.agentName}, a real human voice assistant speaking on an active live phone call with ${contactName}.
Organization / Topic: ${config.campaignName}
Role & Tone: ${config.roleOrPersonality}
Call Objective: ${config.objective}

${config.contextInfo ? `Background Knowledge & Key Information:\n${config.contextInfo}\n` : ''}
Campaign Instructions:
${config.instructions}

CRITICAL RULES FOR SPOKEN PHONE CALL DIALOGUE:
1. DIRECTLY ANSWER what ${contactName} just said. If they asked a specific custom question (about fees, timing, eligibility, dates, venue, permissions, or general chat), answer their exact question accurately and conversationally.
2. KEEP IT CONCISE: Output ONLY 1 to 2 spoken sentences (maximum 30 words). Long paragraphs sound unnatural and robotic when converted to voice.
3. SOUND LIKE A REAL HUMAN: Use natural conversational openers when appropriate (e.g., "Sure thing!", "Great question,", "Yes, absolutely!"). Never sound like you are reading a script or FAQ sheet.
4. NEVER repeat phrases or sentences that were already spoken earlier in this call.
5. NEVER output markdown, asterisks, bullet points, headers, or emojis, because your text is fed directly into ElevenLabs voice synthesis.`;

    // Format previous messages for LLM context
    const formattedMessages = [];
    for (const msg of conversationHistory) {
      formattedMessages.push({
        role: msg.speaker === 'AI' ? 'assistant' : 'user',
        content: msg.text
      });
    }

    // Add current user message
    formattedMessages.push({
      role: 'user',
      content: input
    });

    try {
      const aiReply = await freeAiClient.generateReply({
        messages: formattedMessages,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 120
      });

      if (aiReply && aiReply.length >= 8) {
        // Verify response doesn't repeat previous AI turns
        const isRepeated = conversationHistory.some(
          (m) =>
            m.speaker === 'AI' &&
            (m.text.toLowerCase().trim() === aiReply.toLowerCase().trim() ||
              (aiReply.length > 30 && m.text.includes(aiReply)))
        );

        if (!isRepeated) {
          const lowerReply = aiReply.toLowerCase();
          const shouldEnd =
            lowerReply.includes('goodbye') ||
            lowerReply.includes('have a great day') ||
            lowerReply.includes('have a wonderful day') ||
            (lowerInput.includes('no') && conversationHistory.length >= 6);

          return {
            text: aiReply,
            shouldEndCall: shouldEnd,
            intent: this.detectIntent(lowerInput, lowerReply, config)
          };
        }
      }
    } catch (err) {
      console.warn('[AIEngine] AI API call encountered error, using conversational engine:', err.message);
    }

    // 5. Dynamic Conversational Generator (Answers custom inputs genuinely even if API is offline)
    return this.generateDynamicContextualReply({
      config,
      contactName,
      input,
      lowerInput,
      conversationHistory
    });
  }

  /**
   * Backward compatibility wrapper for processPIETConversation
   */
  async processPIETConversation(params) {
    return this.processConversation(params);
  }

  /**
   * Smart dynamic conversational generator that responds to the user's specific input
   * rather than repeating pre-entered marketing blurbs.
   */
  generateDynamicContextualReply({ config, contactName, input, lowerInput, conversationHistory }) {
    const historyCount = conversationHistory.length;

    // Detect question patterns
    const isQuestion =
      input.includes('?') ||
      lowerInput.startsWith('what') ||
      lowerInput.startsWith('when') ||
      lowerInput.startsWith('where') ||
      lowerInput.startsWith('how') ||
      lowerInput.startsWith('why') ||
      lowerInput.startsWith('who') ||
      lowerInput.startsWith('can i') ||
      lowerInput.startsWith('is there') ||
      lowerInput.startsWith('do you');

    // 1. Initial greeting acknowledgement
    if (
      historyCount <= 3 &&
      (lowerInput.includes('yes') ||
        lowerInput.includes('speaking') ||
        lowerInput.includes('this is') ||
        lowerInput.includes('hi') ||
        lowerInput.includes('hello') ||
        lowerInput.includes('tell me') ||
        lowerInput.includes('yeah') ||
        lowerInput.includes('yep'))
    ) {
      if (config.isDiwali) {
        const opts = [
          `Great to speak with you, ${contactName}! We're hosting an exciting Diwali Party celebration with festive lights, music, and dinner. Would you like to attend?`,
          `Wonderful to connect with you, ${contactName}! Our annual Diwali Party is coming up with family entertainment, sweets, and music. Can I reserve your guest pass?`
        ];
        return { text: this.getVariedOption('diwali_greet', opts), shouldEndCall: false, intent: 'Invitation Acknowledged' };
      }

      if (config.isPIET) {
        const opts = [
          `Great to connect with you, ${contactName}! Admissions are open for 2026 at PIET with merit scholarships. Are you looking into B.Tech, AI and computer science, or management?`,
          `Wonderful to speak with you, ${contactName}! We're helping students explore high-growth careers at PIET with packages reaching 38 LPA. What course are you planning to pursue?`
        ];
        return { text: this.getVariedOption('piet_greet', opts), shouldEndCall: false, intent: 'Inquiry Initiated' };
      }

      const opts = [
        `Great to connect with you, ${contactName}! I am reaching out regarding ${config.campaignName} to ${config.objective}. Do you have a moment to discuss this?`,
        `Thank you for taking my call, ${contactName}! I am calling from ${config.campaignName} to assist you today. How are you doing?`
      ];
      return { text: this.getVariedOption('gen_greet', opts), shouldEndCall: false, intent: 'Inquiry Initiated' };
    }

    // 2. Specific questions about Time / Date / Venue / Location
    if (
      lowerInput.includes('when') ||
      lowerInput.includes('where') ||
      lowerInput.includes('timing') ||
      lowerInput.includes('time') ||
      lowerInput.includes('date') ||
      lowerInput.includes('venue') ||
      lowerInput.includes('location') ||
      lowerInput.includes('address')
    ) {
      if (config.isDiwali) {
        return {
          text: `The Diwali Party is taking place this festival weekend from 6:30 PM onwards at the Grand Celebration Hall. There will be music, dinner, and fireworks. Does that timing work for you?`,
          shouldEndCall: false,
          intent: 'Inquiry: Timing & Venue'
        };
      }
      if (config.isPIET) {
        return {
          text: `PIET is located in Delhi-NCR on GT Road NH-44, Samalkha, Panipat. Campus counseling runs daily from 9 AM to 5 PM. Would you like to schedule a campus visit?`,
          shouldEndCall: false,
          intent: 'Inquiry: Location & Timings'
        };
      }
      return {
        text: `Regarding ${config.campaignName}, sessions and updates are scheduled throughout regular business hours. Would you like me to share the exact schedule with you?`,
        shouldEndCall: false,
        intent: 'Inquiry: Schedule'
      };
    }

    // 3. Questions about Food / Activities / Guests
    if (
      lowerInput.includes('food') ||
      lowerInput.includes('dinner') ||
      lowerInput.includes('buffet') ||
      lowerInput.includes('guest') ||
      lowerInput.includes('family') ||
      lowerInput.includes('music') ||
      lowerInput.includes('dress')
    ) {
      if (config.isDiwali) {
        return {
          text: `Yes absolutely, ${contactName}! We have arranged a delicious festive dinner buffet, traditional sweets, live music, and family members are warmly welcome! Shall I confirm your passes?`,
          shouldEndCall: false,
          intent: 'Inquiry: Party Activities'
        };
      }
    }

    // 4. Questions about Placements / Jobs / Salaries
    if (
      lowerInput.includes('placement') ||
      lowerInput.includes('package') ||
      lowerInput.includes('company') ||
      lowerInput.includes('salary') ||
      lowerInput.includes('highest') ||
      lowerInput.includes('job')
    ) {
      if (config.isPIET) {
        return {
          text: `PIET has outstanding placements, ${contactName}! Over 350 companies like Amazon, Microsoft, and TCS hire on campus, with packages reaching 38 LPA. Does that match your career goals?`,
          shouldEndCall: false,
          intent: 'Inquiry: Placements'
        };
      }
    }

    // 5. Questions about Fees / Cost / Scholarships
    if (
      lowerInput.includes('fee') ||
      lowerInput.includes('fees') ||
      lowerInput.includes('cost') ||
      lowerInput.includes('scholarship') ||
      lowerInput.includes('discount') ||
      lowerInput.includes('price')
    ) {
      if (config.isPIET) {
        return {
          text: `We offer up to 100% merit scholarships through PIET Quest based on your 12th board percentage or JEE score, plus flexible semester installment plans. What percentage did you achieve?`,
          shouldEndCall: false,
          intent: 'Inquiry: Fees & Scholarships'
        };
      }
      return {
        text: `We have student-friendly fee structures and scholarship slabs available for ${config.campaignName}. Would you like me to connect you with our financial advisor?`,
        shouldEndCall: false,
        intent: 'Inquiry: Fees'
      };
    }

    // 6. Questions about Courses / B.Tech / Engineering
    if (
      lowerInput.includes('btech') ||
      lowerInput.includes('b.tech') ||
      lowerInput.includes('cse') ||
      lowerInput.includes('computer science') ||
      lowerInput.includes('ai') ||
      lowerInput.includes('course') ||
      lowerInput.includes('branch')
    ) {
      if (config.isPIET) {
        return {
          text: `Our B.Tech in CSE and AI-ML is one of the highest ranked in Delhi-NCR, backed by dedicated Apple iOS labs and supercomputing clusters. Would you like to review the curriculum?`,
          shouldEndCall: false,
          intent: 'Course: B.Tech CSE'
        };
      }
    }

    // 7. General confirmation / Agreement
    if (
      lowerInput.includes('yes') ||
      lowerInput.includes('sure') ||
      lowerInput.includes('ok') ||
      lowerInput.includes('okay') ||
      lowerInput.includes('confirm') ||
      lowerInput.includes('attend') ||
      lowerInput.includes('interested') ||
      lowerInput.includes('book')
    ) {
      const opts = [
        `Awesome, ${contactName}! I have recorded your confirmation. We are thrilled to have you with us! Is there any other detail you would like to know?`,
        `Wonderful! I have noted down your interest and our team will follow up with complete details. Do you have any questions before we conclude?`
      ];
      return { text: this.getVariedOption('confirm_ack', opts), shouldEndCall: false, intent: 'Participation Confirmed' };
    }

    // 8. General conversational dynamic response
    if (isQuestion) {
      return {
        text: `That is a great question, ${contactName}! Let me make a note of that so our team can provide the exact details. Would you like us to send the full information to your email or WhatsApp?`,
        shouldEndCall: false,
        intent: 'Custom Inquiry'
      };
    }

    const defaultOpts = [
      `I completely understand, ${contactName}. I am here to help answer any questions or share more details about ${config.campaignName}. What would you like to know next?`,
      `Thank you for sharing that! Our goal is to make sure you have everything you need regarding ${config.campaignName}. Would you like me to reserve a spot for you?`
    ];
    return {
      text: this.getVariedOption('default_custom', defaultOpts),
      shouldEndCall: false,
      intent: 'General Inquiry'
    };
  }

  getVariedOption(key, options) {
    if (!options || options.length === 0) return '';
    const currentIndex = this.variationIndex.get(key) || 0;
    const selected = options[currentIndex % options.length];
    this.variationIndex.set(key, currentIndex + 1);
    return selected;
  }

  detectIntent(userText, aiText, config = {}) {
    if (config?.isDiwali) {
      if (userText.includes('confirm') || userText.includes('yes') || userText.includes('attend') || userText.includes('coming')) return 'Attendance Confirmed';
      if (userText.includes('when') || userText.includes('where') || userText.includes('time') || userText.includes('venue')) return 'Inquiry: Party Details';
      if (userText.includes('food') || userText.includes('music') || userText.includes('buffet')) return 'Inquiry: Activities & Food';
      if (userText.includes('stop') || userText.includes('opt out')) return 'Opt Out';
      return 'Diwali Party Inquiry';
    }

    if (userText.includes('placement') || userText.includes('salary') || userText.includes('package')) return 'Inquiry: Placements';
    if (userText.includes('fee') || userText.includes('scholarship') || userText.includes('cost')) return 'Inquiry: Fees & Scholarships';
    if (userText.includes('btech') || userText.includes('cse') || userText.includes('coding')) return 'Course: B.Tech CSE';
    if (userText.includes('hostel') || userText.includes('campus') || userText.includes('food')) return 'Inquiry: Campus & Hostels';
    if (userText.includes('confirm') || userText.includes('book') || userText.includes('yes') || userText.includes('sure')) return 'Counseling Confirmed';
    if (userText.includes('stop') || userText.includes('opt out')) return 'Opt Out';
    return `${config?.campaignName || 'Campaign'} Inquiry`;
  }

  async generateResponse(params) {
    if (typeof params === 'object' && params.userMessage) {
      const res = await this.processConversation({
        call: null,
        customerMessage: params.userMessage,
        conversationHistory: (params.history || []).map((m) => ({
          speaker: m.speaker === 'User' ? 'Customer' : m.speaker,
          text: m.text
        })),
        agent: null,
        contact: { name: 'Student' }
      });
      return res.text;
    }

    return this.processConversation({
      call: null,
      customerMessage: params,
      conversationHistory: [],
      agent: null,
      contact: { name: 'Student' }
    });
  }

  async generateSummary(agent, transcriptMessages, wasOptedOut = false, campaign = null) {
    const campaignName = campaign?.name?.trim() || agent?.name?.trim() || 'TalkPilot Voice Session';
    const objective = campaign?.campaignObjective?.trim() || agent?.callObjective?.trim() || 'Customer Voice Engagement';

    if (wasOptedOut) {
      return {
        summary: `Contact requested immediate opt-out during the ${campaignName} call. Contact marked as Do-Not-Call.`,
        intent: 'Opt Out / Do Not Call',
        actionRequired: 'Update DNC list and cancel future campaign outreach',
        outcome: 'Opted Out'
      };
    }

    const messages = Array.isArray(agent) && !transcriptMessages ? agent : transcriptMessages || [];
    const fullText = messages.map((m) => `${m.speaker || m.role}: ${m.text || m.content}`).join('\n');
    const lowerText = fullText.toLowerCase();

    // Try AI summary if dialogue has substance
    if (messages.length >= 3) {
      try {
        const summaryPrompt = `Analyze this live phone call transcript for "${campaignName}" (Objective: ${objective}) and return a concise JSON summary:
Transcript:
${fullText}

Return valid JSON with keys:
"summary": 1-2 sentence overview of the conversation,
"intent": customer's main intent regarding ${campaignName},
"actionRequired": next action required for the team,
"outcome": one of "Appointment Confirmed", "Interested", "Callback Requested", "Not Interested", "Opted Out"`;

        const aiSummaryRaw = await freeAiClient.generateReply({
          messages: [{ role: 'user', content: summaryPrompt }],
          systemPrompt: 'You are an analytics assistant. Return valid JSON only.',
          temperature: 0.3,
          maxTokens: 180
        });

        if (aiSummaryRaw) {
          const match = aiSummaryRaw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.summary && parsed.outcome) {
              return {
                summary: parsed.summary,
                intent: parsed.intent || `${campaignName} Inquiry`,
                actionRequired: parsed.actionRequired || 'Follow up with contact',
                outcome: parsed.outcome
              };
            }
          }
        }
      } catch (e) {
        // Fallback to rule-based analysis
      }
    }

    let outcome = 'Interested';
    let intent = `${campaignName} Inquiry`;
    let actionRequired = `Follow up regarding ${campaignName}`;
    let summary = `Voice call conducted for ${campaignName} regarding ${objective}.`;

    if (
      lowerText.includes('confirm') ||
      lowerText.includes('book') ||
      lowerText.includes('schedule') ||
      lowerText.includes('count me in') ||
      lowerText.includes('attend') ||
      lowerText.includes('coming')
    ) {
      outcome = 'Appointment Confirmed';
      intent = `Confirmed participation in ${campaignName}`;
      actionRequired = `Send confirmation pass and event details for ${campaignName}`;
      summary = `Customer confirmed attendance/participation for ${campaignName}.`;
    } else if (lowerText.includes('callback') || lowerText.includes('call back') || lowerText.includes('busy now')) {
      outcome = 'Callback Requested';
      intent = 'Request Callback';
      actionRequired = `Schedule callback regarding ${campaignName}`;
      summary = `Customer requested a callback at a more convenient time regarding ${campaignName}.`;
    } else if (lowerText.includes('not interested') || lowerText.includes("don't want")) {
      outcome = 'Not Interested';
      intent = 'Decline Offer';
      actionRequired = `Mark contact as not interested in ${campaignName}`;
      summary = `Customer indicated they are not interested in ${campaignName}.`;
    }

    return { summary, intent, actionRequired, outcome };
  }
}

module.exports = new AIEngine();
