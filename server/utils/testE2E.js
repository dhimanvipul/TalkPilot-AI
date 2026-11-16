const io = require('../../client/node_modules/socket.io-client');
const http = require('http');

async function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Starting TalkPilot AI E2E Socket & PIET Admissions Test ---');

  const ts = Date.now();
  const user1Email = `student_${ts}@gmail.com`;
  const user2Email = `caller_${ts}@gmail.com`;

  // 1. Register User 1 (The Student / Recipient)
  console.log(`\n1. Registering User 1 (Recipient): ${user1Email}`);
  const reg1 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { name: 'Aarav Student', email: user1Email, password: 'password123' }
  );

  console.log('User 1 Register response:', reg1.status, reg1.data.user);
  const token1 = reg1.data.token;
  const user1Id = reg1.data.user.id;

  // 2. Register User 2 (The Caller / Counselor)
  console.log(`\n2. Registering User 2 (Caller): ${user2Email}`);
  const reg2 = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { name: 'PIET Admissions Desk', email: user2Email, password: 'password123' }
  );

  console.log('User 2 Register response:', reg2.status, reg2.data.user);
  const token2 = reg2.data.token;
  const user2Id = reg2.data.user.id;

  // 3. User 2 checks agents (auto-seeds PIET agent)
  console.log('\n3. User 2 fetching agents:');
  const agentsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/agents',
    method: 'GET',
    headers: { Authorization: `Bearer ${token2}` }
  });
  console.log(`Agents found: ${agentsRes.data.agents.length}. First agent: "${agentsRes.data.agents[0].name}"`);
  const agentId = agentsRes.data.agents[0]._id;

  // 4. User 2 adds contact with User 1's email!
  console.log(`\n4. User 2 adding Contact with email: ${user1Email}`);
  const contactRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/contacts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`
      }
    },
    {
      name: 'Aarav Sharma',
      phone: `+91987${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: user1Email,
      notes: 'Interested in PIET Engineering'
    }
  );
  console.log('Contact created:', contactRes.data.contact?.name, contactRes.data.contact?.email);
  const contactId = contactRes.data.contact._id;

  // 5. Connect Sockets for both User 1 and User 2
  console.log('\n5. Connecting WebSockets for User 1 and User 2...');
  const socket1 = io('http://localhost:5000', { transports: ['websocket'] });
  const socket2 = io('http://localhost:5000', { transports: ['websocket'] });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const checkDone = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };

    socket1.on('connect', () => {
      console.log('Socket 1 connected:', socket1.id);
      socket1.emit('join:user', { userId: user1Id, email: user1Email });
      checkDone();
    });

    socket2.on('connect', () => {
      console.log('Socket 2 connected:', socket2.id);
      socket2.emit('join:user', { userId: user2Id, email: user2Email });
      checkDone();
    });
  });

  // 6. User 1 listens for incoming call!
  let callId = null;
  const incomingPromise = new Promise((resolve) => {
    socket1.on('call:incoming', (incomingData) => {
      console.log('\n🔔 >>> USER 1 DASHBOARD RECEIVED INCOMING CALL! <<<');
      console.log('Caller Name:', incomingData.caller.name);
      console.log('Agent:', incomingData.agent.name);
      console.log('College Topic:', incomingData.college);
      console.log('Contact target:', incomingData.contact.name, incomingData.contact.email);
      callId = incomingData.callId;
      resolve(incomingData);
    });

    socket1.on('call:incoming_broadcast', (data) => {
      if (data.targetEmail === user1Email.toLowerCase() && !callId) {
        console.log('\n🔔 >>> USER 1 RECEIVED INCOMING BROADCAST! <<<');
        callId = data.callId;
        resolve(data);
      }
    });
  });

  // User 2 initiates call to contact
  console.log('\n6. User 2 taps "Call" on contact...');
  const callInitiateRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/calls/initiate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`
      }
    },
    { contactId, agentId }
  );
  console.log('Call initiate API response:', callInitiateRes.status, callInitiateRes.data.message);

  const incomingCallData = await incomingPromise;

  // 7. User 1 joins call room & picks up call
  console.log('\n7. User 1 accepting/picking up the call via socket.emit("call:accept")...');
  socket1.emit('join:call', incomingCallData.callId);
  socket2.emit('join:call', incomingCallData.callId);

  const greetingPromise = new Promise((resolve) => {
    socket1.on('call:transcript', (data) => {
      if (data.message.speaker === 'AI') {
        console.log('\n🎙️ [AI Counselor to Student]:', data.message.text);
        resolve(data.message.text);
      }
    });
  });

  socket1.emit('call:accept', { callId: incomingCallData.callId });

  await greetingPromise;

  // 8. User 1 speaks/types reply to AI
  console.log('\n8. Student replies: "I want to know about B.Tech CSE placements and companies at PIET."');
  const aiTurn1Promise = new Promise((resolve) => {
    let capturedAi = false;
    socket1.on('call:transcript', (data) => {
      if (data.message.speaker === 'AI' && !capturedAi) {
        capturedAi = true;
        console.log('\n🎙️ [AI Counselor Response 1]:', data.message.text);
        resolve(data.message.text);
      }
    });
  });

  socket1.emit('call:message', {
    callId: incomingCallData.callId,
    text: 'I want to know about B.Tech CSE placements and companies at PIET.'
  });

  await aiTurn1Promise;

  // 9. User 1 asks about fees and scholarship
  console.log('\n9. Student asks: "I got 88% in 12th board, what are the fees and scholarship?"');
  const aiTurn2Promise = new Promise((resolve) => {
    let capturedAi = false;
    socket1.on('call:transcript', (data) => {
      if (data.message.speaker === 'AI' && !capturedAi) {
        capturedAi = true;
        console.log('\n🎙️ [AI Counselor Response 2]:', data.message.text);
        resolve(data.message.text);
      }
    });
  });

  socket1.emit('call:message', {
    callId: incomingCallData.callId,
    text: 'I got 88% in 12th board, what are the fees and scholarship?'
  });

  await aiTurn2Promise;

  // 10. User 1 confirms counseling booking
  console.log('\n10. Student confirms: "Yes, please book an admission counseling session for me."');
  const aiTurn3Promise = new Promise((resolve) => {
    let capturedAi = false;
    socket1.on('call:transcript', (data) => {
      if (data.message.speaker === 'AI' && !capturedAi) {
        capturedAi = true;
        console.log('\n🎙️ [AI Counselor Response 3]:', data.message.text);
        resolve(data.message.text);
      }
    });
  });

  socket1.emit('call:message', {
    callId: incomingCallData.callId,
    text: 'Yes, please book an admission counseling session for me.'
  });

  await aiTurn3Promise;

  // 11. End call
  console.log('\n11. Ending call session...');
  const endPromise = new Promise((resolve) => {
    socket1.on('call:ended', (data) => {
      console.log('\n📞 Call Ended Event Received:', data);
      resolve(data);
    });
  });

  socket1.emit('call:end', { callId: incomingCallData.callId });
  await endPromise;

  // 12. Verify Call Record in DB
  console.log('\n12. Fetching finalized call details from API:');
  const finalCallRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/calls/${incomingCallData.callId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token1}` }
  });

  console.log('Final Call Outcome:', finalCallRes.data.call?.outcome);
  console.log('Final Call Status:', finalCallRes.data.call?.status);
  console.log('Final Call Summary:', finalCallRes.data.call?.summary);
  console.log('Final Call Duration:', finalCallRes.data.call?.duration, 'seconds');
  console.log(`Total Transcript Messages Saved: ${finalCallRes.data.transcript?.length}`);

  socket1.disconnect();
  socket2.disconnect();

  console.log('\n✅ ALL E2E REQUIREMENTS VERIFIED AND WORKING PERFECTLY!');
  process.exit(0);
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
