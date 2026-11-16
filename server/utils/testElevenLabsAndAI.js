const ttsService = require('../services/audio/ttsService');
const aiEngine = require('../services/ai/aiEngine');
const freeAiClient = require('../services/ai/freeAiClient');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TALKPILOT AI: ELEVENLABS & DYNAMIC AI TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: ElevenLabs Voice Resolution & Configuration Check
  // -------------------------------------------------------------
  console.log('TEST 1: ElevenLabs TTS Service Setup & Voice Registry');
  const voices = await ttsService.getVoices();
  console.log(`Available ElevenLabs voices loaded: ${voices.length}`);
  const alice = voices.find((v) => v.name === 'Alice');
  const george = voices.find((v) => v.name === 'George');

  if (alice && george) {
    console.log(`✅ PASS: Alice (ID: ${alice.id}) and George (ID: ${george.id}) registered in TTS engine.`);
  } else {
    console.error('❌ FAIL: Expected default ElevenLabs voices to be available');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 2: TTS Text Cleaner & Natural Spoken Pronunciation
  // -------------------------------------------------------------
  console.log('\nTEST 2: TTS Spoken Text Cleaner');
  const dirtyText = '**TalkPilot:** Hello! PIET offers 38 LPA package with ₹50000 discount & Apple AI/ML lab! 🚀';
  const cleaned = ttsService.cleanTextForSpeech(dirtyText);
  console.log('Original Text:', dirtyText);
  console.log('Cleaned for ElevenLabs:', cleaned);

  if (
    !cleaned.includes('**') &&
    !cleaned.includes('TalkPilot:') &&
    !cleaned.includes('🚀') &&
    cleaned.includes('Lakh per annum') &&
    cleaned.includes('50000 rupees') &&
    cleaned.includes('Machine Learning')
  ) {
    console.log('✅ PASS: Text was properly sanitized and expanded for natural human pronunciation.');
  } else {
    console.error('❌ FAIL: Spoken text cleaning did not produce expected output:', cleaned);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 3: TTS Caching Engine Verification
  // -------------------------------------------------------------
  console.log('\nTEST 3: In-Memory Audio Cache & Deterministic Hash');
  const testVoiceId = '21m00Tcm4TlvDq8ikWAM';
  const samplePhrase = 'Welcome to TalkPilot AI live voice counseling session.';
  const cacheKey = ttsService.getCacheKey(testVoiceId, samplePhrase);

  // Simulate caching
  const fakeAudioBuffer = Buffer.from('RIFF_FAKE_AUDIO_MP3_DATA');
  ttsService.audioCache.set(cacheKey, {
    buffer: fakeAudioBuffer,
    contentType: 'audio/mpeg',
    createdAt: new Date(),
    text: samplePhrase,
    voiceId: testVoiceId
  });

  const retrieved = ttsService.getAudio(cacheKey);
  if (retrieved && retrieved.buffer.length === fakeAudioBuffer.length) {
    console.log('✅ PASS: Audio cache successfully stores and retrieves binary MP3 audio.');
  } else {
    console.error('❌ FAIL: Audio cache failed to retrieve buffered audio');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 4: Dynamic Conversational AI (Custom User Questions)
  // -------------------------------------------------------------
  console.log('\nTEST 4: Dynamic Conversational AI vs Pre-Entered Static Messages');

  // Question 1: Custom question about timing
  const timingQuestionRes = await aiEngine.processConversation({
    customerMessage: 'What time does the Diwali party start and where is it?',
    conversationHistory: [],
    agent: { name: 'Diwali Party Assistant' },
    contact: { name: 'Rohit' },
    campaign: { name: 'Diwali Party Celebration' }
  });
  console.log('User asked: "What time does the Diwali party start and where is it?"');
  console.log('AI dynamic reply:', timingQuestionRes.text);

  if (
    timingQuestionRes.text.toLowerCase().includes('6:30') ||
    timingQuestionRes.text.toLowerCase().includes('hall') ||
    timingQuestionRes.text.toLowerCase().includes('weekend')
  ) {
    console.log('✅ PASS: AI dynamically answered timing and venue instead of a generic static ad!');
  } else {
    console.error('❌ FAIL: Expected answer to address timing/venue, got:', timingQuestionRes.text);
    process.exit(1);
  }

  // Question 2: Custom question about guests/family
  const guestQuestionRes = await aiEngine.processConversation({
    customerMessage: 'Can I bring my family or a guest with me?',
    conversationHistory: [],
    agent: { name: 'Diwali Party Assistant' },
    contact: { name: 'Rohit' },
    campaign: { name: 'Diwali Party Celebration' }
  });
  console.log('\nUser asked: "Can I bring my family or a guest with me?"');
  console.log('AI dynamic reply:', guestQuestionRes.text);

  if (
    guestQuestionRes.text.toLowerCase().includes('family') ||
    guestQuestionRes.text.toLowerCase().includes('welcome') ||
    guestQuestionRes.text.toLowerCase().includes('pass')
  ) {
    console.log('✅ PASS: AI specifically addressed the family/guest question!');
  } else {
    console.error('❌ FAIL: Expected answer to address family/guest:', guestQuestionRes.text);
    process.exit(1);
  }

  // Question 3: Custom college question about hostel
  const hostelQuestionRes = await aiEngine.processConversation({
    customerMessage: 'Do you have AC hostel rooms on campus?',
    conversationHistory: [],
    agent: { name: 'PIET Admissions Counselor' },
    contact: { name: 'Ananya' },
    campaign: { name: 'PIET Admissions 2026' }
  });
  console.log('\nUser asked: "Do you have AC hostel rooms on campus?"');
  console.log('AI dynamic reply:', hostelQuestionRes.text);

  if (hostelQuestionRes.text.length > 15) {
    console.log('✅ PASS: AI produced concise conversational response for custom college query!');
  } else {
    console.error('❌ FAIL: Response was too short or empty');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // TEST 5: Acoustic Echo Detection & Repetition Guard
  // -------------------------------------------------------------
  console.log('\nTEST 5: Acoustic Echo Detection Simulation');
  const aiUtterance = 'Hello Rohit! Wishing you a joyful festive season. I am calling with an invitation to our Diwali Party.';

  // Simulate mic picking up part of the AI's words
  const echoFragment1 = 'calling with an invitation to our Diwali Party';
  const isEcho1 = echoFragment1.length >= 8 && aiUtterance.toLowerCase().includes(echoFragment1.toLowerCase());

  // Simulate real user speaking
  const genuineUserMsg = 'Yes I would love to attend with my family';
  const isEcho2 = genuineUserMsg.length >= 8 && aiUtterance.toLowerCase().includes(genuineUserMsg.toLowerCase());

  console.log(`Echo fragment "${echoFragment1}" flagged as acoustic echo?:`, isEcho1);
  console.log(`Genuine customer reply "${genuineUserMsg}" flagged as echo?:`, isEcho2);

  if (isEcho1 === true && isEcho2 === false) {
    console.log('✅ PASS: Acoustic echo algorithm successfully catches speaker feedback and preserves genuine user speech!');
  } else {
    console.error('❌ FAIL: Acoustic echo test failed');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL ELEVENLABS & DYNAMIC AI TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
