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

// Enhanced content analysis
function analyzePageContent() {
    const title = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    const bodyText = document.body ? document.body.innerText.toLowerCase() : '';
    
    // Analyze content type
    const contentAnalysis = {
        type: detectContentType(title, url, bodyText),
        sentiment: analyzeSentiment(title, bodyText),
        isDistraction: detectDistraction(title, url, bodyText),
        readingTime: estimateReadingTime(bodyText),
        hasVideo: document.querySelectorAll('video').length > 0,
        hasAds: document.querySelectorAll('[id*="ad"], [class*="ad"]').length > 0
    };
    
    chrome.runtime.sendMessage({
        type: 'content_analysis',
        url: window.location.href,
        title: document.title,
        analysis: contentAnalysis
    });
}

function detectContentType(title, url, bodyText) {
    // News content
    if (title.includes('news') || url.includes('news') || 
        bodyText.includes('breaking') || bodyText.includes('reporter')) {
        return 'news';
    }
    
    // Educational content
    if (title.includes('how to') || title.includes('tutorial') || 
        url.includes('learn') || bodyText.includes('explanation')) {
        return 'educational';
    }
    
    // Entertainment content
    if (title.includes('funny') || title.includes('meme') || 
        url.includes('entertainment') || bodyText.includes('comedy')) {
        return 'entertainment';
    }
    
    // Work/Professional content
    if (url.includes('github') || url.includes('stackoverflow') || 
        url.includes('docs') || bodyText.includes('documentation')) {
        return 'work';
    }
    
    // Social content
    if (url.includes('facebook') || url.includes('twitter') || 
        url.includes('instagram') || bodyText.includes('follow')) {
        return 'social';
    }
    
    return 'general';
}

function analyzeSentiment(title, bodyText) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'success'];
    const negativeWords = ['bad', 'terrible', 'awful', 'crisis', 'disaster', 'failure'];
    
    const text = title + ' ' + bodyText.substring(0, 1000); // Sample first 1000 chars
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

function detectDistraction(title, url, bodyText) {
    const distractingKeywords = [
        'trending', 'viral', 'breaking', 'celebrity', 'gossip',
        'shocking', 'amazing', 'incredible', 'must-see',
        'notification', 'alert', 'urgent', 'clickbait',
        'you won\'t believe', 'this will shock you'
    ];
    
    const text = title + ' ' + url + ' ' + bodyText.substring(0, 500);
    
    return distractingKeywords.some(keyword => text.includes(keyword));
}

function estimateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.split(' ').length;
    return Math.ceil(words / wordsPerMinute);
}

// Focus mode functionality
let focusModeActive = false;
let focusBlockedSites = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com'];

function checkFocusMode() {
    chrome.storage.local.get(['focusMode'], (result) => {
        focusModeActive = result.focusMode || false;
        
        if (focusModeActive) {
            const currentDomain = window.location.hostname;
            const isBlocked = focusBlockedSites.some(site => currentDomain.includes(site));
            
            if (isBlocked) {
                showFocusBlock();
            }
        }
    });
}

function showFocusBlock() {
    // Create focus mode overlay
    const overlay = document.createElement('div');
    overlay.id = 'mindful-focus-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(103, 126, 234, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center; max-width: 400px; padding: 40px;">
            <h1 style="font-size: 32px; margin-bottom: 20px;">🎯 Focus Mode Active</h1>
            <p style="font-size: 18px; margin-bottom: 30px;">
                You're in focus mode. This site may be distracting from your goals.
            </p>
            <div style="margin-bottom: 20px;">
                <button id="focus-continue" style="
                    background: white;
                    color: #677eea;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-right: 10px;
                ">Continue Anyway</button>
                <button id="focus-back" style="
                    background: transparent;
                    color: white;
                    border: 2px solid white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">Go Back</button>
            </div>
            <p style="font-size: 14px; opacity: 0.8;">
                Take a moment to consider if this aligns with your current goals.
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('focus-continue').addEventListener('click', () => {
        overlay.remove();
        // Temporarily allow this site for 10 minutes
        setTimeout(() => {
            if (focusModeActive) {
                location.reload();
            }
        }, 600000); // 10 minutes
    });
    
    document.getElementById('focus-back').addEventListener('click', () => {
        window.history.back();
    });
}

// Check focus mode on page load
checkFocusMode();

// Listen for focus mode changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'focus_mode_changed') {
        focusModeActive = message.enabled;
        if (focusModeActive) {
            checkFocusMode();
        } else {
            const overlay = document.getElementById('mindful-focus-overlay');
            if (overlay) overlay.remove();
        }
    }
});

// Run content analysis on page load
analyzePageContent();
