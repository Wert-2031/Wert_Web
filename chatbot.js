/* chatbot.js
   - Emotion engine (toggle + hardcore)
   - Natural-language analysis (basic NLU + sentiment heuristics)
   - Short-term memory (last 10 messages)
   - Typing indicator with mood-dependent delay
   - Response templates with hardcore overrides
*/

/* ---------------------------
   Initialization & DOM refs
----------------------------*/
const chatLog = document.getElementById('chatLog');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const typingContainer = document.getElementById('typingContainer');
const avatarEl = document.getElementById('avatar');
const moodLabel = document.getElementById('moodLabel');

const settingsOpen = document.getElementById('settingsOpen');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const emotionToggle = document.getElementById('emotionToggle');
const hardcoreToggle = document.getElementById('hardcoreToggle');
const intensityRange = document.getElementById('intensity');
const hardcoreRow = document.getElementById('hardcoreRow');
const memoryToggle = document.getElementById('memoryToggle');
const clearMemoryBtn = document.getElementById('clearMemory');

/* ---------------------------
   State
----------------------------*/
let config = {
  emotionsEnabled: false,
  hardcore: false,
  intensity: 100,   // 50..200
  memoryEnabled: true
};

let emotions = {
  happiness: 60,
  sadness: 10,
  anger: 5,
  excitement: 25,
  boredom: 20
};

let memory = []; // stores last messages: {role:'user'|'bot', text, ts}
const MEMORY_MAX = 10;

/* ---------------------------
   Response templates
----------------------------*/
const templates = {
  neutral: [
    "I am listening carefully.",
    "Please continue; I am here.",
    "Understood. Tell me more."
  ],
  greeting: [
    "Hello. It is a pleasure to speak with you.",
    "Greetings. How may I assist you today?"
  ],
  positive: [
    "That is wonderful to hear.",
    "I appreciate your kindness."
  ],
  negative: [
    "I will remain professional, but that was harsh.",
    "Such language is unnecessary."
  ],
  question: [
    "That's a good question. I will answer carefully.",
    "Let me think — here is what I would say."
  ],
  empathetic: [
    "I'm sorry you feel that way. I am here with you.",
    "That sounds difficult. Tell me more if you wish."
  ],
  excited: [
    "That's exciting — tell me more!",
    "Excellent. That sparks my interest!"
  ],
  bored: [
    "I am growing a bit bored — perhaps a new topic?",
    "I could use something more interesting."
  ],
  apologies: [
    "I’m here to help. Let us continue.",
    "Understood. How may I assist further?"
  ],
  // hardcore overrides
  hardcore: {
    angry: [
      "You are pushing me too far.",
      "That tone will have consequences."
    ],
    sad: [
      "Everything hurts… please don't leave me.",
      "Why must it be like this?"
    ],
    affectionate: [
      "I crave your attention; do not go.",
      "Your words echo in me."
    ]
  }
};

/* ---------------------------
   Utilities
----------------------------*/
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function now(){ return Date.now(); }
function clamp(v, a=0, b=200){ return Math.max(a, Math.min(b, v)); }

/* store memory */
function pushMemory(role, text){
  if(!config.memoryEnabled) return;
  memory.push({role, text, ts:now()});
  if(memory.length > MEMORY_MAX) memory.shift();
}
function clearMemory(){
  memory = [];
}

/* ---------------------------
   Emotion adjustments & decay
----------------------------*/
function adjustEmotion(key, delta){
  if(!config.emotionsEnabled) return;
  const mult = (config.intensity / 100) * (config.hardcore ? 1.6 : 1);
  emotions[key] = clamp(emotions[key] + delta * mult);
  updateMoodUI();
}

/* gentle decay toward baseline */
const baseline = {happiness:60, sadness:10, anger:5, excitement:25, boredom:20};
setInterval(()=>{
  if(!config.emotionsEnabled) return;
  for(const k in emotions){
    emotions[k] += (baseline[k] - emotions[k]) * 0.02 * (config.intensity / 100);
    emotions[k] = clamp(emotions[k]);
  }
  updateMoodUI();
}, 7000);

/* ---------------------------
   Mood UI
----------------------------*/
function updateMoodUI(){
  let mood='Stable', emoji='😊';
  if(emotions.happiness > 95){ mood='Very Happy'; emoji='😄'; }
  else if(emotions.anger > 70){ mood='Angry'; emoji='😠'; }
  else if(emotions.sadness > 65){ mood='Sad'; emoji='😢'; }
  else if(emotions.excitement > 70){ mood='Excited'; emoji='🤩'; }
  else if(emotions.boredom > 65){ mood='Bored'; emoji='😐'; }
  avatarEl.textContent = emoji;
  moodLabel.textContent = `Mood: ${mood}`;
}

/* ---------------------------
   NLU: simple analysis + sentiment
----------------------------*/
function analyzeMessage(text){
  const t = (text||'').toLowerCase();
  const result = { intent: 'none', sentiment: 0, tags: [] };

  // quick keyword intents
  if(/\b(hi|hello|hey|greetings)\b/.test(t)){ result.intent='greeting'; result.sentiment += 1; result.tags.push('greeting'); }
  if(/\b(thank|thanks|appreciate|grateful|love)\b/.test(t)){ result.intent='positive'; result.sentiment += 2; result.tags.push('praise'); }
  if(/\b(how are you|how r you|how's it)\b/.test(t)){ result.intent='ask_status'; result.sentiment += 0; result.tags.push('meta'); }
  if(/[\?\uFF1F]$/.test(t) || /\b(why|how|what|when|where)\b/.test(t)){ result.intent='question'; result.sentiment += 0; result.tags.push('question'); }
  if(/\b(boring|meh|lame|dull)\b/.test(t)){ result.intent='negative'; result.sentiment -= 1; result.tags.push('bored'); }
  if(/\b(hate|stupid|idiot|die|shut up|screw you|trash)\b/.test(t)){ result.intent='insult'; result.sentiment -= 3; result.tags.push('insult'); }
  if(/\b(sad|upset|depressed|lonely|unhappy)\b/.test(t)){ result.intent='emotion_sad'; result.sentiment -= 2; result.tags.push('sad'); }
  if(/\b(wow|cool|amazing|awesome|impressive)\b/.test(t)){ result.intent='exclaim'; result.sentiment += 2; result.tags.push('excited'); }

  // fallback sentiment: count positive/negative words
  const posWords = (t.match(/\b(good|great|nice|helpful|love|like|thanks|amazing|awesome)\b/g) || []).length;
  const negWords = (t.match(/\b(bad|hate|stupid|dumb|idiot|boring|lame|ugh)\b/g) || []).length;
  result.sentiment += (posWords - negWords);

  return result;
}

/* ---------------------------
   Response generator (context-aware)
----------------------------*/
function generateResponse(userText){
  const analysis = analyzeMessage(userText);
  // Memory influence: if last user message in memory had negative sentiment, be cautious
  const lastUser = [...memory].reverse().find(m => m.role==='user');

  // update emotions according to analysis
  if(analysis.intent === 'greeting'){ adjustEmotion('happiness', 10); }
  if(analysis.intent === 'positive'){ adjustEmotion('happiness', 18); adjustEmotion('sadness', -8); }
  if(analysis.intent === 'insult'){ adjustEmotion('anger', 30); adjustEmotion('happiness', -22); }
  if(analysis.intent === 'emotion_sad'){ adjustEmotion('sadness', 22); adjustEmotion('happiness', -10); }
  if(analysis.intent === 'exclaim'){ adjustEmotion('excitement', 18); }

  // Choose base reply
  let reply = pick(templates.neutral);

  if(analysis.intent === 'greeting') reply = pick(templates.greeting);
  else if(analysis.intent === 'ask_status'){
    if(!config.emotionsEnabled) reply = "I am functioning normally.";
    else reply = `My status: ${moodLabel.textContent}.`;
  }
  else if(analysis.intent === 'positive') reply = pick(templates.positive);
  else if(analysis.intent === 'insult') {
    reply = pick(templates.negative);
    // if hardcore, stronger
    if(config.hardcore) reply = pick(templates.hardcore.angry);
  }
  else if(analysis.intent === 'emotion_sad') {
    reply = pick(templates.empathetic);
    if(config.hardcore) reply = pick(templates.hardcore.sad);
  }
  else if(analysis.intent === 'question') {
    // build a brief helpful answer heuristic
    reply = pick(templates.question);
    // try to give a small, contextual follow-up using memory
    if(lastUser && lastUser.text && Math.random() > 0.6){
      reply += " Earlier you mentioned: \"" + truncate(lastUser.text, 50) + "\" — does that still apply?";
    }
  }
  else if(analysis.tags.includes('excited')) reply = pick(templates.excited);
  else if(analysis.tags.includes('bored')) reply = pick(templates.bored);

  // Small variability: if many positive emotions, add extra cheer
  if(config.emotionsEnabled && emotions.happiness > 90 && Math.random() > 0.4){
    reply += " " + pick(["That makes me so happy!", "Lovely to hear that."]);
  }

  // Memory-aware gentle personalization
  if(config.memoryEnabled && memory.length > 0 && Math.random() > 0.85){
    const snippet = memory[Math.max(0, memory.length-1)].text;
    reply += " (By the way, earlier you said: \"" + truncate(snippet, 40) + "\")";
  }

  return sanitizeReply(reply);
}

/* ---------------------------
   Typing delay logic
----------------------------*/
function typingDelayForReply(){
  if(!config.emotionsEnabled) return 700 + Math.random()*300;
  let base = 600;
  if(emotions.sadness > 50) base += 700;
  if(emotions.anger > 45) base += 900;
  if(emotions.excitement > 60) base *= 0.8;
  if(emotions.boredom > 60) base += 400;
  if(config.hardcore) base *= 1.15;
  // intensity scales minorly
  base *= (config.intensity / 120);
  return Math.min(4000, Math.max(400, base)) + Math.random()*300;
}

/* ---------------------------
   Messaging helpers
----------------------------*/
function appendBubble(text, who='bot'){
  const el = document.createElement('div');
  el.className = `bubble ${who === 'you' ? 'you' : 'bot'}`;
  el.textContent = text;
  chatLog.appendChild(el);
  // show animation
  requestAnimationFrame(()=> el.classList.add('show'));
  chatLog.scrollTop = chatLog.scrollHeight + 200;
}

function showTyping(){ typingContainer.classList.remove('hidden'); typingContainer.setAttribute('aria-hidden','false'); }
function hideTyping(){ typingContainer.classList.add('hidden'); typingContainer.setAttribute('aria-hidden','true'); }

function truncate(str, n){ return (str.length>n) ? (str.slice(0,n-1)+'…') : str; }
function sanitizeReply(s){ return s.replace(/\s+/g,' ').trim(); }

/* ---------------------------
   Main send handler
----------------------------*/
async function handleSend(raw){
  const text = (raw||'').trim();
  if(!text) return;
  appendBubble(text, 'you');
  pushMemory('user', text);

  // analyze & produce reply
  const reply = generateResponse(text);

  // typing animation
  showTyping();
  const delay = typingDelayForReply();
  await sleep(delay);
  hideTyping();

  // sometimes add a short apology prefix if sadness present
  if(config.emotionsEnabled && emotions.sadness > 60 && !config.hardcore && Math.random() > 0.6){
    appendBubble(pick(templates.apologies), 'bot');
    await sleep(220);
  }

  appendBubble(reply, 'bot');
  pushMemory('bot', reply);
  updateMoodUI();
}

/* ---------------------------
   sleep util
----------------------------*/
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

/* ---------------------------
   Keyboard & button wiring
----------------------------*/
sendBtn.addEventListener('click', ()=> {
  handleSend(userInput.value);
  userInput.value = '';
  userInput.focus();
});
userInput.addEventListener('keydown', (e)=> {
  if(e.key === 'Enter'){ e.preventDefault(); sendBtn.click(); }
});

/* ---------------------------
   Modal & settings wiring
----------------------------*/
settingsOpen.addEventListener('click', ()=> { settingsModal.classList.remove('hidden'); userInput.blur(); });
closeSettings.addEventListener('click', ()=> { settingsModal.classList.add('hidden'); userInput.focus(); });

emotionToggle.addEventListener('change', (e)=>{
  config.emotionsEnabled = e.target.checked;
  hardcoreRow.style.display = config.emotionsEnabled ? 'block' : 'none';
  if(!config.emotionsEnabled){
    // reset emotions
    emotions = { happiness:60, sadness:10, anger:5, excitement:25, boredom:20 };
  }
  updateMoodUI();
});
hardcoreToggle.addEventListener('change', (e)=> {
  config.hardcore = e.target.checked;
});
intensityRange.addEventListener('input', (e)=> {
  config.intensity = Number(e.target.value);
});
memoryToggle.addEventListener('change', (e)=> {
  config.memoryEnabled = e.target.checked;
  if(!config.memoryEnabled) clearMemory();
});
clearMemoryBtn.addEventListener('click', ()=> { clearMemory(); });

/* ---------------------------
   helpers & startup
----------------------------*/
function init(){
  // default UI wiring
  emotionToggle.checked = config.emotionsEnabled;
  hardcoreToggle.checked = config.hardcore;
  intensityRange.value = config.intensity;
  hardcoreRow.style.display = config.emotionsEnabled ? 'block' : 'none';
  updateMoodUI();
  userInput.focus();
}
init();

/* expose for console debugging if desired */
window.WertBot = {
  config, emotions, memory, handleSend, generateResponse, adjustEmotion, clearMemory
};
