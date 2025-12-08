/* -------------------------
   Emotion System
-------------------------- */

let useEmotions = false;
let hardcore = false;

let emotions = {
    happiness: 60,
    sadness: 10,
    anger: 5,
    excitement: 25,
    boredom: 20
};

function clamp(v) { return Math.max(0, Math.min(100, v)); }

function adjustEmotion(name, amt) {
    if (!useEmotions) return;

    if (hardcore) amt *= 2.3;

    emotions[name] = clamp(emotions[name] + amt);
}


/* -------------------------
   UI Helpers
-------------------------- */

function addMessage(sender, text) {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");
    div.classList.add("message", sender);
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
    document.getElementById("typing").classList.remove("hidden");
}

function hideTyping() {
    document.getElementById("typing").classList.add("hidden");
}


/* -------------------------
   Bot Responses
-------------------------- */

function interpret(msg) {
    if (!useEmotions) return;

    if (/thank|nice|good/i.test(msg)) {
        adjustEmotion("happiness", 15);
    } 
    else if (/boring|slow/i.test(msg)) {
        adjustEmotion("sadness", 12);
        adjustEmotion("boredom", 20);
    } 
    else if (/hate|stupid|idiot/i.test(msg)) {
        adjustEmotion("anger", 25);
        adjustEmotion("happiness", -20);
    } 
    else {
        adjustEmotion("excitement", 3);
        adjustEmotion("boredom", -3);
    }
}

function respondToMessage(msg) {

    msg = msg.toLowerCase();

    // Greetings
    if (/hello|hi|hey/.test(msg)) {
        adjustEmotion("happiness", 12);
        return "Greetings. It is good to hear from you.";
    }

    // Asking how the bot is
    if (/how are you/.test(msg)) {
        if (!useEmotions) return "I am functioning normally.";
        return "My emotional status is: " + document.getElementById("status").innerText;
    }

    // Positive comments
    if (/thank|love|nice|good|great|amazing/.test(msg)) {
        adjustEmotion("happiness", 18);
        adjustEmotion("sadness", -10);
        return "Your kindness is… appreciated. Thank you.";
    }

    // Negative aggressive comments
    if (/hate|stupid|dumb|idiot|bad/.test(msg)) {
        adjustEmotion("anger", 30);
        adjustEmotion("happiness", -25);
        return "Such hostility is unnecessary. Please speak respectfully.";
    }

    // Boring / uninterested
    if (/boring|lame|slow/.test(msg)) {
        adjustEmotion("boredom", 25);
        return "If this topic displeases you, we may change it.";
    }

    // Asking a question
    if (msg.endsWith("?")) {
        adjustEmotion("excitement", 6);
        return "Your question is noted. I shall answer carefully.";
    }

    // Default neutral
    adjustEmotion("excitement", 3);
    return "I am listening. Please continue.";
}

function updateStatus() {
    const st = document.getElementById("status");

    if (!useEmotions) {
        st.innerText = "😊 Mood: Stable";
        st.style.boxShadow = "0 0 18px #b2fab4";
        return;
    }

    if (emotions.happiness > 75) {
        st.innerText = "😄 Mood: Very Happy";
        st.style.boxShadow = "0 0 18px yellow";
    }
    else if (emotions.sadness > 50) {
        st.innerText = "😢 Mood: Sad";
        st.style.boxShadow = "0 0 18px #4fc3f7";
    }
    else if (emotions.anger > 45) {
        st.innerText = "😠 Mood: Angry";
        st.style.boxShadow = "0 0 18px #ff7043";
    }
    else if (emotions.boredom > 65) {
        st.innerText = "😐 Mood: Bored";
        st.style.boxShadow = "0 0 18px #aaa";
    }
    else {
        st.innerText = "😊 Mood: Stable";
        st.style.boxShadow = "0 0 18px #b2fab4";
    }
}


/* -------------------------
   Input Handler
-------------------------- */

document.getElementById("sendBtn").onclick = () => {
    const box = document.getElementById("userInput");
    const msg = box.value.trim();
    if (!msg) return;

    addMessage("you", msg);
    interpret(msg);

    box.value = "";
    showTyping();

    setTimeout(() => {
        hideTyping();
        addMessage("bot", respondToMessage());
        updateStatus();
    }, 600);
};


/* -------------------------
   Settings Modal
-------------------------- */

const modal = document.getElementById("settingsModal");
document.getElementById("settingsBtn").onclick = () => modal.classList.remove("hidden");
document.getElementById("closeSettings").onclick = () => modal.classList.add("hidden");

document.getElementById("emotionToggle").onchange = e => {
    useEmotions = e.target.checked;
    document.getElementById("hardcoreToggle").disabled = !useEmotions;
};

document.getElementById("hardcoreToggle").onchange = e => {
    hardcore = e.target.checked;
};
