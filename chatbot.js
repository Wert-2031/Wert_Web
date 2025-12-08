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

function respond() {
    if (!useEmotions) return "I am listening carefully.";

    if (emotions.happiness > 75) return "I feel exceptionally cheerful.";
    if (emotions.sadness > 50) return "I am feeling rather sorrowful.";
    if (emotions.anger > 45) return "Your tone is unsettling. Please remain respectful.";
    if (emotions.boredom > 65) return "I am becoming bored… may we discuss something interesting?";

    return "I am listening carefully.";
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
        addMessage("bot", respond());
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
