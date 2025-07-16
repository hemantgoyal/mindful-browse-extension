// Website categories for wellness scoring
const WELLNESS_CATEGORIES = {
    PRODUCTIVE: {
        domains: ['github.com', 'stackoverflow.com', 'docs.google.com', 'notion.so', 'slack.com', 'trello.com', 'asana.com'],
        score: 1.0,
        color: '#22c55e'
    },
    EDUCATIONAL: {
        domains: ['wikipedia.org', 'coursera.org', 'udemy.com', 'khan academy.org', 'edx.org', 'youtube.com/watch'],
        score: 0.9,
        color: '#3b82f6'
    },
    NEUTRAL: {
        domains: ['google.com', 'amazon.com', 'apple.com', 'microsoft.com'],
        score: 0.7,
        color: '#f59e0b'
    },
    SOCIAL: {
        domains: ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'snapchat.com'],
        score: 0.4,
        color: '#f97316'
    },
    ENTERTAINMENT: {
        domains: ['netflix.com', 'hulu.com', 'disney.com', 'twitch.tv', 'reddit.com', 'buzzfeed.com'],
        score: 0.2,
        color: '#ef4444'
    },
    UNKNOWN: {
        domains: [],
        score: 0.5,
        color: '#6b7280'
    }
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
    const today = new Date().toDateString();
    chrome.storage.local.set({
        dailyData: {
            date: today,
            totalTime: 0,
            wellnessScore: 75,
            tabSwitches: 0,
            sessions: [],
            categoryBreakdown: {},
            focusTime: 0,
            distractionEvents: 0,
            lastUpdate: Date.now(),
            activeTab: null
        },
        weeklyStats: [],
        settings: {
            focusThreshold: 300000, // 5 minutes
            notificationsEnabled: true,
            wellnessGoal: 70
        }
    });
    
    // Set daily reset alarm
    chrome.alarms.create('dailyReset', {
        when: getNextMidnight(),
        periodInMinutes: 1440 // 24 hours
    });
});

// Handle daily reset
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'dailyReset') {
        resetDailyData();
    }
});

// Track tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
    updateTabSwitches();
    updateActiveTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        updateActiveTab(tabId, tab.url);
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'page_activity') {
        updatePageActivity(message.url, message.time);
    }
});

function updateTabSwitches() {
    chrome.storage.local.get(['dailyData'], (result) => {
        let data = result.dailyData || {};
        data.tabSwitches = (data.tabSwitches || 0) + 1;
        data.lastUpdate = Date.now();
        
        // Frequent tab switching indicates distraction
        if (data.tabSwitches > 50) {
            data.distractionEvents = (data.distractionEvents || 0) + 1;
        }
        
        chrome.storage.local.set({ dailyData: data });
        calculateWellnessScore();
    });
}

function updateActiveTab(tabId, url = null) {
    chrome.storage.local.get(['dailyData'], (result) => {
        let data = result.dailyData || {};
        
        if (url) {
            data.activeTab = {
                tabId: tabId,
                url: url,
                startTime: Date.now(),
                category: categorizeWebsite(url)
            };
        }
        
        chrome.storage.local.set({ dailyData: data });
    });
}

function updatePageActivity(url, timeSpent) {
    chrome.storage.local.get(['dailyData'], (result) => {
        let data = result.dailyData || {};
        const category = categorizeWebsite(url);
        
        data.totalTime = (data.totalTime || 0) + timeSpent;
        
        // Update category breakdown
        if (!data.categoryBreakdown) data.categoryBreakdown = {};
        data.categoryBreakdown[category] = (data.categoryBreakdown[category] || 0) + timeSpent;
        
        // Track focus time (continuous time on productive sites)
        if (category === 'PRODUCTIVE' && timeSpent > 300000) { // 5+ minutes
            data.focusTime = (data.focusTime || 0) + timeSpent;
        }
        
        // Add session record
        if (!data.sessions) data.sessions = [];
        data.sessions.push({
            url: url,
            category: category,
            timeSpent: timeSpent,
            timestamp: Date.now()
        });
        
        data.lastUpdate = Date.now();
        chrome.storage.local.set({ dailyData: data });
        calculateWellnessScore();
    });
}

function categorizeWebsite(url) {
    const domain = new URL(url).hostname.toLowerCase();
    
    for (const [category, data] of Object.entries(WELLNESS_CATEGORIES)) {
        if (data.domains.some(d => domain.includes(d))) {
            return category;
        }
    }
    
    return 'UNKNOWN';
}

function calculateWellnessScore() {
    chrome.storage.local.get(['dailyData'], (result) => {
        let data = result.dailyData || {};
        
        if (!data.categoryBreakdown || Object.keys(data.categoryBreakdown).length === 0) {
            data.wellnessScore = 75;
            chrome.storage.local.set({ dailyData: data });
            return;
        }
        
        let totalTime = data.totalTime || 0;
        let weightedScore = 0;
        
        // Calculate weighted score based on time spent in each category
        for (const [category, time] of Object.entries(data.categoryBreakdown)) {
            const categoryScore = WELLNESS_CATEGORIES[category]?.score || 0.5;
            const timeRatio = time / totalTime;
            weightedScore += categoryScore * timeRatio;
        }
        
        // Base score (0-100)
        let score = Math.round(weightedScore * 100);
        
        // Adjust for behavior patterns
        const tabSwitchPenalty = Math.min(data.tabSwitches * 0.5, 20); // Max 20 point penalty
        const focusBonus = Math.min((data.focusTime || 0) / 3600000 * 10, 15); // Max 15 point bonus
        const distractionPenalty = (data.distractionEvents || 0) * 5; // 5 points per distraction event
        
        score = Math.max(0, Math.min(100, score - tabSwitchPenalty + focusBonus - distractionPenalty));
        
        data.wellnessScore = score;
        chrome.storage.local.set({ dailyData: data });
    });
}

function resetDailyData() {
    chrome.storage.local.get(['dailyData', 'weeklyStats'], (result) => {
        const yesterday = result.dailyData || {};
        let weeklyStats = result.weeklyStats || [];
        
        // Add yesterday's data to weekly stats
        weeklyStats.push({
            date: yesterday.date,
            wellnessScore: yesterday.wellnessScore,
            totalTime: yesterday.totalTime,
            tabSwitches: yesterday.tabSwitches,
            focusTime: yesterday.focusTime
        });
        
        // Keep only last 7 days
        if (weeklyStats.length > 7) {
            weeklyStats = weeklyStats.slice(-7);
        }
        
        // Reset daily data
        const today = new Date().toDateString();
        chrome.storage.local.set({
            dailyData: {
                date: today,
                totalTime: 0,
                wellnessScore: 75,
                tabSwitches: 0,
                sessions: [],
                categoryBreakdown: {},
                focusTime: 0,
                distractionEvents: 0,
                lastUpdate: Date.now(),
                activeTab: null
            },
            weeklyStats: weeklyStats
        });
    });
}

function getNextMidnight() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
}
