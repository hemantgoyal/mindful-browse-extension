// Track page activity and engagement
let startTime = Date.now();
let lastActivity = Date.now();
let scrollDepth = 0;
let maxScrollDepth = 0;
let clickCount = 0;
let focusTime = 0;

// Track user engagement
document.addEventListener('click', () => {
    clickCount++;
    lastActivity = Date.now();
});

document.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    scrollDepth = Math.round((scrollTop + windowHeight) / documentHeight * 100);
    maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);
    lastActivity = Date.now();
});

document.addEventListener('keydown', () => {
    lastActivity = Date.now();
});

// Track focus/blur events
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page lost focus
        sendActivityData();
    } else {
        // Page gained focus
        startTime = Date.now();
        lastActivity = Date.now();
    }
});

window.addEventListener('beforeunload', () => {
    sendActivityData();
});

// Send activity data periodically
setInterval(() => {
    sendActivityData();
}, 5000);

function sendActivityData() {
    const currentTime = Date.now();
    const sessionTime = currentTime - startTime;
    
    // Calculate engagement score based on user activity
    const timeSinceActivity = currentTime - lastActivity;
    const isEngaged = timeSinceActivity < 30000; // Active in last 30 seconds
    
    const engagementScore = calculateEngagementScore(sessionTime, clickCount, maxScrollDepth, isEngaged);
    
    chrome.runtime.sendMessage({
        type: 'page_activity',
        url: window.location.href,
        time: sessionTime,
        engagement: {
            score: engagementScore,
            clicks: clickCount,
            scrollDepth: maxScrollDepth,
            isActive: isEngaged
        },
        metadata: {
            title: document.title,
            domain: window.location.hostname,
            timestamp: currentTime
        }
    });
    
    // Reset counters
    startTime = currentTime;
    clickCount = 0;
    maxScrollDepth = 0;
}

function calculateEngagementScore(sessionTime, clicks, scrollDepth, isActive) {
    let score = 0;
    
    // Time-based scoring (longer sessions = higher engagement)
    if (sessionTime > 60000) score += 0.3; // 1+ minute
    if (sessionTime > 300000) score += 0.2; // 5+ minutes
    
    // Interaction-based scoring
    if (clicks > 3) score += 0.2;
    if (clicks > 10) score += 0.1;
    
    // Scroll depth scoring
    if (scrollDepth > 25) score += 0.1;
    if (scrollDepth > 75) score += 0.1;
    
    // Activity scoring
    if (isActive) score += 0.1;
    
    return Math.min(1.0, score);
}

// Monitor for distracting content
function analyzePageContent() {
    const title = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    // Keywords that might indicate distracting content
    const distractingKeywords = [
        'trending', 'viral', 'breaking', 'celebrity', 'gossip',
        'shocking', 'amazing', 'incredible', 'must-see',
        'notification', 'alert', 'urgent'
    ];
    
    const isDistraction = distractingKeywords.some(keyword => 
        title.includes(keyword) || url.includes(keyword)
    );
    
    if (isDistraction) {
        chrome.runtime.sendMessage({
            type: 'distraction_detected',
            url: window.location.href,
            title: document.title
        });
    }
}

// Run content analysis on page load
analyzePageContent();
