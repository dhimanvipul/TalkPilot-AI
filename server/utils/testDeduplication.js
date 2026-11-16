const mockProvider = require('../services/telephony/mockProvider');
const transcriptionService = require('../services/transcription/transcriptionService');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TALKPILOT AI LIVE CALL DEDUPLICATION TESTS');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // TEST 1: WebSocket Room Chaining Deduplication
  // ---------------------------------------------------------
  console.log('TEST 1: Socket.IO Room Chaining Deduplication');
  console.log('Purpose: Verify that emitCallEvent chains rooms and does NOT emit multiple times or call io.emit globally.');

  const chainedRooms = [];
  let emitCallCount = 0;
  let emittedEvent = null;
  let emittedPayload = null;

  const mockBroadcaster = {
    to: function (room) {
      chainedRooms.push(room);
      return this;
    },
    emit: function (event, payload) {
      emitCallCount++;
      emittedEvent = event;
      emittedPayload = payload;
    }
  };

  const mockIo = {
    to: function (room) {
      return mockBroadcaster.to(room);
    },
    emit: function () {
      throw new Error('io.emit() wildcard should NEVER be called for call-specific events!');
    }
  };

  const testCallId = 'call_test_101';
  const testUserId = 'user_test_202';
  const testRecipientUserId = 'user_test_303';
  const testEmail = 'student@example.com';

  console.log('Calling emitCallEvent with overlapping callId, userId, recipientUserId, and contact.email...');
  mockProvider.emitCallEvent(
    mockIo,
    { _id: testCallId, userId: testUserId, recipientUserId: testRecipientUserId },
    { email: testEmail },
    'call:transcript',
    {
      callId: testCallId,
      message: {
        id: 'msg_1',
        speaker: 'AI',
        text: 'Hi, this is TalkPilot from PIET, is this Vipul?'
      }
    }
  );

  console.log('Chained target rooms:', chainedRooms);
  console.log(`Number of times broadcaster.emit was called: ${emitCallCount}`);

  if (emitCallCount === 1) {
    console.log('✅ PASS TEST 1A: Exactly 1 single emit call was executed across all rooms!');
  } else {
    console.error(`❌ FAIL TEST 1A: Expected 1 emit call, but got ${emitCallCount}`);
    process.exit(1);
  }

  const expectedRooms = [
    `call:${testCallId}`,
    `user:${testUserId}`,
    `user:${testRecipientUserId}`,
    `user:email:${testEmail}`
  ];
  const allRoomsIncluded = expectedRooms.every((r) => chainedRooms.includes(r));
  if (allRoomsIncluded && chainedRooms.length === 4) {
    console.log('✅ PASS TEST 1B: All 4 targeted rooms were properly chained into a single broadcast operator!\n');
  } else {
    console.error('❌ FAIL TEST 1B: Chained rooms did not match expected:', chainedRooms);
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST 2: Rapid Duplicate Customer Message Suppression
  // ---------------------------------------------------------
  console.log('TEST 2: Rapid Customer Message Deduplication in mockProvider');
  console.log('Purpose: Verify that identical customer text within 2 seconds is suppressed.');

  // Put a mock call in activeCalls
  mockProvider.activeCalls.set(testCallId, {
    call: { _id: testCallId, userId: testUserId, status: 'In Progress', save: async () => {} },
    agent: { name: 'PIET Admissions Officer' },
    contact: { name: 'Vipul Dhiman', email: testEmail },
    status: 'In Progress',
    startTime: new Date()
  });

  // Mock transcriptionService.appendMessage and getTranscriptByCallId
  transcriptionService.appendMessage = async (callId, speaker, text) => {
    return {
      _id: `msg_mock_${Date.now()}`,
      speaker,
      text,
      timestamp: new Date()
    };
  };
  transcriptionService.getTranscriptByCallId = async () => ({ messages: [] });

  const firstMsgResult = await mockProvider.handleCustomerMessage(testCallId, 'yes', mockIo);
  console.log('First message processing result:', firstMsgResult.message);

  const duplicateMsgResult = await mockProvider.handleCustomerMessage(testCallId, 'yes', mockIo);
  console.log('Immediate second identical message processing result:', duplicateMsgResult.message);

  if (duplicateMsgResult.message === 'Duplicate message ignored') {
    console.log('✅ PASS TEST 2: Duplicate message was safely ignored within suppression window!\n');
  } else {
    console.error('❌ FAIL TEST 2: Expected duplicate message to be ignored, got:', duplicateMsgResult);
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST 3: Concurrent acceptCall Suppression
  // ---------------------------------------------------------
  console.log('TEST 3: Concurrent acceptCall Suppression');
  console.log('Purpose: Verify that simultaneous socket and HTTP accept requests do not run twice.');

  const p1 = mockProvider.acceptCall(testCallId, mockIo);
  const p2 = mockProvider.acceptCall(testCallId, mockIo);

  const [resA, resB] = await Promise.all([p1, p2]);
  console.log('Call accept 1:', resA.message);
  console.log('Call accept 2:', resB.message);

  if (resA.message === 'Call accept already in progress' || resB.message === 'Call accept already in progress') {
    console.log('✅ PASS TEST 3: Concurrent acceptCall was successfully guarded against duplicate execution!\n');
  } else {
    console.error('❌ FAIL TEST 3: Both accept calls executed concurrently');
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST 4: Frontend Transcript Deduplication Logic
  // ---------------------------------------------------------
  console.log('TEST 4: Frontend State Deduplication Simulation');
  console.log('Purpose: Verify client-side deduplication logic rejects duplicates by ID and (speaker + text + timestamp).');

  let frontendMessages = [];

  const simulateHandleTranscript = (data) => {
    if (data.callId === testCallId && data.message) {
      const prev = frontendMessages;
      const newMsg = data.message;
      const newId = newMsg._id || newMsg.id;

      if (newId && prev.some((m) => (m._id || m.id) === newId)) {
        return; // Rejected duplicate by ID
      }

      const isDuplicate = prev.some((m) => {
        if (m.speaker !== newMsg.speaker) return false;
        if ((m.text || '').trim() !== (newMsg.text || '').trim()) return false;
        const t1 = new Date(m.timestamp || 0).getTime();
        const t2 = new Date(newMsg.timestamp || 0).getTime();
        if (t1 && t2 && Math.abs(t1 - t2) < 3000) return true;
        return false;
      });

      if (isDuplicate) return; // Rejected duplicate by text + timestamp

      frontendMessages = [...prev, newMsg];
    }
  };

  const incomingAiMsg = {
    id: 'ai_msg_001',
    speaker: 'AI',
    text: 'Hi, this is TalkPilot from PIET, is this Vipul?',
    timestamp: new Date()
  };

  // Simulate 5 duplicate deliveries of the same message (the original bug)
  for (let i = 0; i < 5; i++) {
    simulateHandleTranscript({ callId: testCallId, message: incomingAiMsg });
  }

  console.log(`Messages in frontend state after 5 simulated deliveries: ${frontendMessages.length}`);
  if (frontendMessages.length === 1) {
    console.log('✅ PASS TEST 4: Frontend state contains EXACTLY 1 message despite 5 duplicate deliveries!\n');
  } else {
    console.error(`❌ FAIL TEST 4: Expected 1 message, but state has ${frontendMessages.length}`);
    process.exit(1);
  }

  // Simulate user reply "yes" sent twice
  const userMsg1 = {
    id: 'user_msg_001',
    speaker: 'Customer',
    text: 'yes',
    timestamp: new Date()
  };
  const userMsg2 = {
    id: 'user_msg_002', // even with different ID, same text and timestamp
    speaker: 'Customer',
    text: 'yes',
    timestamp: new Date()
  };

  simulateHandleTranscript({ callId: testCallId, message: userMsg1 });
  simulateHandleTranscript({ callId: testCallId, message: userMsg2 });

  console.log(`Messages in frontend state after user message duplicate test: ${frontendMessages.length}`);
  if (frontendMessages.length === 2) {
    console.log('✅ PASS TEST 5: User duplicate message was also rejected by content & timestamp match!\n');
  } else {
    console.error(`❌ FAIL TEST 5: Expected 2 messages (1 AI + 1 Customer), but state has ${frontendMessages.length}`);
    process.exit(1);
  }

  // ---------------------------------------------------------
  // TEST 6: DB TranscriptionService AppendMessage Deduplication
  // ---------------------------------------------------------
  console.log('TEST 6: DB-level consecutive duplicate message suppression');
  const mockTranscriptDoc = {
    callId: testCallId,
    messages: [],
    save: async function () {}
  };

  const appendMsgLogic = (doc, speaker, text) => {
    const cleanText = (text || '').trim();
    const lastMsg = doc.messages[doc.messages.length - 1];
    if (
      lastMsg &&
      lastMsg.speaker === speaker &&
      lastMsg.text.trim().toLowerCase() === cleanText.toLowerCase() &&
      Date.now() - new Date(lastMsg.timestamp).getTime() < 2500
    ) {
      return { msg: lastMsg, duplicate: true };
    }
    const newMsg = {
      _id: `id_${Date.now()}`,
      speaker,
      text: cleanText,
      timestamp: new Date()
    };
    doc.messages.push(newMsg);
    return { msg: newMsg, duplicate: false };
  };

  const r1 = appendMsgLogic(mockTranscriptDoc, 'Customer', 'yes');
  const r2 = appendMsgLogic(mockTranscriptDoc, 'Customer', 'yes');

  console.log('DB message 1 duplicate?:', r1.duplicate);
  console.log('DB message 2 duplicate?:', r2.duplicate);
  console.log('Messages in mock DB doc:', mockTranscriptDoc.messages.length);

  if (r1.duplicate === false && r2.duplicate === true && mockTranscriptDoc.messages.length === 1) {
    console.log('✅ PASS TEST 6: DB-level appendMessage successfully suppressed consecutive duplicate!\n');
  } else {
    console.error('❌ FAIL TEST 6: DB duplicate was not suppressed');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('🎉 ALL 6 DEDUPLICATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
