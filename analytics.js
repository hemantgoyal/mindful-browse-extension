// Analytics page functionality
const WELLNESS_CATEGORIES = {
    PRODUCTIVE: { score: 1.0, color: '#22c55e', name: 'Productive' },
    EDUCATIONAL: { score: 0.9, color: '#3b82f6', name: 'Educational' },
    NEUTRAL: { score: 0.7, color: '#f59e0b', name: 'Neutral' },
    SOCIAL: { score: 0.4, color: '#f97316', name: 'Social' },
    ENTERTAINMENT: { score: 0.2, color: '#ef4444', name: 'Entertainment' },
    UNKNOWN: { score: 0.5, color: '#6b7280', name: 'Unknown' }
};

let currentDateRange = 'today';

document.addEventListener('DOMContentLoaded', function() {
    loadAnalyticsData();
    
    // Set up event listeners
    document.getElementById('date-range').addEventListener('change', (e) => {
        currentDateRange = e.target.value;
        loadAnalyticsData();
    });
});

function loadAnalyticsData() {
    chrome.storage.local.get(['dailyData', 'weeklyStats'], (result) => {
        const dailyData = result.dailyData || {};
        const weeklyStats = result.weeklyStats || [];
        
        updateStatsOverview(dailyData, weeklyStats);
        updateWebsiteBreakdown(dailyData);
        updateContentAnalysis(dailyData);
        updateHourlyActivity(dailyData);
        updateSentimentAnalysis(dailyData);
        updateDetailedSessions(dailyData);
        updateInsightsRecommendations(dailyData);
        updateWeeklyProgress(weeklyStats);
    });
}

function updateStatsOverview(data, weeklyStats) {
    // Wellness Score
    document.getElementById('wellness-score').textContent = data.wellnessScore || 75;
    
    // Total Time
    const totalHours = Math.floor((data.totalTime || 0) / 3600000);
    const totalMinutes = Math.floor(((data.totalTime || 0) % 3600000) / 60000);
    document.getElementById('total-time').textContent = `${totalHours}h ${totalMinutes}m`;
    
    // Focus Time
    const focusHours = Math.floor((data.focusTime || 0) / 3600000);
    const focusMinutes = Math.floor(((data.focusTime || 0) % 3600000) / 60000);
    document.getElementById('focus-time').textContent = `${focusHours}h ${focusMinutes}m`;
    
    // Distractions
    document.getElementById('distractions').textContent = data.distractionEvents || 0;
    
    // Calculate changes from yesterday
    if (weeklyStats.length > 0) {
        const yesterday = weeklyStats[weeklyStats.length - 1];
        updateStatChange('wellness-change', data.wellnessScore - (yesterday.wellnessScore || 75), 'score');
        updateStatChange('time-change', (data.totalTime || 0) - (yesterday.totalTime || 0), 'time');
        updateStatChange('focus-change', (data.focusTime || 0) - (yesterday.focusTime || 0), 'time');
        updateStatChange('distraction-change', (data.distractionEvents || 0) - (yesterday.distractionEvents || 0), 'number');
    }
}

function updateStatChange(elementId, change, type) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let text = '';
    let className = 'neutral';
    
    if (type === 'time') {
        const hours = Math.floor(Math.abs(change) / 3600000);
        const minutes = Math.floor((Math.abs(change) % 3600000) / 60000);
        const sign = change >= 0 ? '+' : '-';
        text = `${sign}${hours > 0 ? hours + 'h ' : ''}${minutes}m from yesterday`;
        className = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    } else if (type === 'score') {
        text = `${change >= 0 ? '+' : ''}${change} from yesterday`;
        className = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
    } else if (type === 'number') {
        text = `${change >= 0 ? '+' : ''}${change} from yesterday`;
        className = change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral'; // Less distractions = positive
    }
    
    element.textContent = text;
    element.className = `stat-change ${className}`;
}

function updateWebsiteBreakdown(data) {
    const container = document.getElementById('website-breakdown');
    if (!data.sessions || data.sessions.length === 0) {
        container.innerHTML = '<div class="loading">No browsing data available</div>';
        return;
    }
    
    // Aggregate time by website
    const websiteStats = {};
    data.sessions.forEach(session => {
        try {
            const domain = new URL(session.url).hostname;
            if (!websiteStats[domain]) {
                websiteStats[domain] = {
                    domain: domain,
                    totalTime: 0,
                    visits: 0,
                    category: session.category,
                    lastVisit: session.timestamp
                };
            }
            websiteStats[domain].totalTime += session.timeSpent;
            websiteStats[domain].visits++;
            websiteStats[domain].lastVisit = Math.max(websiteStats[domain].lastVisit, session.timestamp);
        } catch (e) {
            // Skip invalid URLs
        }
    });
    
    // Sort by time spent and take top 10
    const topWebsites = Object.values(websiteStats)
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 10);
    
    const maxTime = Math.max(...topWebsites.map(w => w.totalTime));
    
    container.innerHTML = '';
    topWebsites.forEach(website => {
        const hours = Math.floor(website.totalTime / 3600000);
        const minutes = Math.floor((website.totalTime % 3600000) / 60000);
        const percentage = (website.totalTime / maxTime) * 100;
        
        const websiteItem = document.createElement('div');
        websiteItem.className = 'website-item';
        websiteItem.innerHTML = `
            <div class="website-info">
                <div class="website-favicon">${website.domain.charAt(0).toUpperCase()}</div>
                <div class="website-details">
                    <div class="website-name">${website.domain}</div>
                    <div class="website-url">${website.visits} visits</div>
                </div>
            </div>
            <div class="website-stats">
                <div class="time-spent">${hours > 0 ? hours + 'h ' : ''}${minutes}m</div>
                <div class="time-bar">
                    <div class="time-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        container.appendChild(websiteItem);
    });
}

function updateContentAnalysis(data) {
    const container = document.getElementById('content-chart');
    
    if (!data.contentAnalysis || data.contentAnalysis.length === 0) {
        container.innerHTML = '<div class="loading">No content analysis available</div>';
        return;
    }
    
    // Aggregate content types
    const contentTypes = {};
    data.contentAnalysis.forEach(analysis => {
        const type = analysis.analysis.type || 'general';
        contentTypes[type] = (contentTypes[type] || 0) + 1;
    });
    
    const total = Object.values(contentTypes).reduce((sum, count) => sum + count, 0);
    const sortedTypes = Object.entries(contentTypes)
        .sort(([,a], [,b]) => b - a);
    
    container.innerHTML = '';
    sortedTypes.forEach(([type, count]) => {
        const percentage = Math.round((count / total) * 100);
        const color = getContentTypeColor(type);
        
        const contentItem = document.createElement('div');
        contentItem.className = 'content-item';
        contentItem.innerHTML = `
            <div class="content-type">
                <div class="content-color" style="background-color: ${color}"></div>
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
            <div class="content-percentage">${percentage}%</div>
        `;
        container.appendChild(contentItem);
    });
}

function updateHourlyActivity(data) {
    const container = document.getElementById('hourly-chart');
    
    // Initialize hourly data
    const hourlyData = new Array(24).fill(0);
    
    if (data.sessions) {
        data.sessions.forEach(session => {
            const hour = new Date(session.timestamp).getHours();
            hourlyData[hour] += session.timeSpent;
        });
    }
    
    const maxActivity = Math.max(...hourlyData, 1); // Avoid division by zero
    
    container.innerHTML = '';
    hourlyData.forEach((activity, hour) => {
        const height = (activity / maxActivity) * 100;
        const minutes = Math.floor(activity / 60000);
        
        const barElement = document.createElement('div');
        barElement.className = 'hour-bar';
        barElement.style.height = `${Math.max(height, 4)}%`;
        barElement.title = `${hour}:00 - ${minutes} minutes`;
        
        const labelElement = document.createElement('div');
        labelElement.className = 'hour-label';
        labelElement.textContent = hour;
        
        barElement.appendChild(labelElement);
        container.appendChild(barElement);
    });
}

function updateSentimentAnalysis(data) {
    const container = document.getElementById('sentiment-chart');
    
    if (!data.contentAnalysis || data.contentAnalysis.length === 0) {
        container.innerHTML = '<div class="loading">No sentiment data available</div>';
        return;
    }
    
    // Aggregate sentiment
    const sentiments = { positive: 0, negative: 0, neutral: 0 };
    data.contentAnalysis.forEach(analysis => {
        const sentiment = analysis.analysis.sentiment || 'neutral';
        sentiments[sentiment]++;
    });
    
    const total = Object.values(sentiments).reduce((sum, count) => sum + count, 0);
    
    container.innerHTML = '';
    Object.entries(sentiments).forEach(([sentiment, count]) => {
        const percentage = Math.round((count / total) * 100);
        const color = sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#6b7280';
        
        const sentimentItem = document.createElement('div');
        sentimentItem.className = 'sentiment-item';
        sentimentItem.innerHTML = `
            <div class="content-type">
                <div class="content-color" style="background-color: ${color}"></div>
                <span>${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</span>
            </div>
            <div class="content-percentage">${percentage}%</div>
        `;
        container.appendChild(sentimentItem);
    });
}

function updateDetailedSessions(data) {
    const container = document.getElementById('session-list');
    
    if (!data.sessions || data.sessions.length === 0) {
        container.innerHTML = '<div class="loading">No session data available</div>';
        return;
    }
    
    // Sort sessions by timestamp (most recent first)
    const sortedSessions = [...data.sessions].sort((a, b) => b.timestamp - a.timestamp);
    
    container.innerHTML = '';
    sortedSessions.slice(0, 50).forEach(session => { // Show last 50 sessions
        const time = new Date(session.timestamp).toLocaleTimeString();
        const duration = Math.floor(session.timeSpent / 60000); // Convert to minutes
        const category = session.category?.toLowerCase() || 'neutral';
        
        let title = session.url;
        try {
            const domain = new URL(session.url).hostname;
            title = domain;
        } catch (e) {
            // Keep original URL if parsing fails
        }
        
        const sessionItem = document.createElement('div');
        sessionItem.className = `session-item ${category}`;
        sessionItem.innerHTML = `
            <div class="session-time">${time}</div>
            <div class="session-details">
                <div class="session-title">${title}</div>
                <div class="session-url">${session.url.substring(0, 60)}${session.url.length > 60 ? '...' : ''}</div>
            </div>
            <div class="session-duration">${duration}m</div>
        `;
        container.appendChild(sessionItem);
    });
}

function updateInsightsRecommendations(data) {
    const container = document.getElementById('insights-grid');
    
    const insights = generateDetailedInsights(data);
    
    container.innerHTML = '';
    insights.forEach(insight => {
        const insightCard = document.createElement('div');
        insightCard.className = `insight-card ${insight.type}`;
        insightCard.innerHTML = `
            <div class="insight-title">${insight.icon} ${insight.title}</div>
            <div class="insight-description">${insight.description}</div>
        `;
        container.appendChild(insightCard);
    });
}

function updateWeeklyProgress(weeklyStats) {
    const container = document.getElementById('progress-chart');
    
    if (!weeklyStats || weeklyStats.length === 0) {
        container.innerHTML = '<div class="loading">No weekly data available</div>';
        return;
    }
    
    const maxScore = Math.max(...weeklyStats.map(day => day.wellnessScore), 100);
    
    container.innerHTML = '';
    weeklyStats.forEach(day => {
        const height = (day.wellnessScore / maxScore) * 100;
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayElement = document.createElement('div');
        dayElement.className = 'progress-day';
        dayElement.innerHTML = `
            <div class="progress-bar" style="height: ${Math.max(height, 10)}%"></div>
            <div class="progress-label">${dayName}</div>
            <div class="progress-score">${day.wellnessScore}</div>
        `;
        container.appendChild(dayElement);
    });
}

function generateDetailedInsights(data) {
    const insights = [];
    
    // Wellness insights
    if (data.wellnessScore >= 85) {
        insights.push({
            type: 'positive',
            icon: '🏆',
            title: 'Excellent Digital Wellness!',
            description: 'You\'re maintaining fantastic browsing habits. Your wellness score is in the top tier, indicating great balance between productive and leisure activities.'
        });
    } else if (data.wellnessScore < 50) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Room for Improvement',
            description: 'Your wellness score suggests you might be spending too much time on distracting content. Consider setting focus goals and using our focus mode feature.'
        });
    }
    
    // Time insights
    const totalHours = (data.totalTime || 0) / 3600000;
    if (totalHours > 8) {
        insights.push({
            type: 'warning',
            icon: '⏰',
            title: 'High Screen Time',
            description: `You've spent ${Math.round(totalHours)} hours browsing today. Consider taking regular breaks and setting daily time limits for better digital wellness.`
        });
    }
    
    // Focus insights
    const focusRatio = (data.focusTime || 0) / (data.totalTime || 1);
    if (focusRatio > 0.6) {
        insights.push({
            type: 'positive',
            icon: '🎯',
            title: 'Great Focus Ratio',
            description: `${Math.round(focusRatio * 100)}% of your browsing time was spent on productive activities. Keep up the excellent work!`
        });
    } else if (focusRatio < 0.3) {
        insights.push({
            type: 'info',
            icon: '💡',
            title: 'Focus Opportunity',
            description: 'Try to increase your focus time by visiting more educational and work-related sites. Use our focus mode to block distracting websites.'
        });
    }
    
    // Content insights
    if (data.contentAnalysis && data.contentAnalysis.length > 0) {
        const negativeContent = data.contentAnalysis.filter(a => a.analysis.sentiment === 'negative').length;
        const total = data.contentAnalysis.length;
        
        if (negativeContent / total > 0.4) {
            insights.push({
                type: 'warning',
                icon: '😔',
                title: 'Negative Content Exposure',
                description: `${Math.round((negativeContent/total)*100)}% of your consumed content has negative sentiment. Consider balancing with more positive, uplifting content.`
            });
        }
    }
    
    // Tab switching insights
    if (data.tabSwitches > 200) {
        insights.push({
            type: 'info',
            icon: '🔄',
            title: 'High Tab Activity',
            description: `You switched tabs ${data.tabSwitches} times today. Frequent tab switching can indicate scattered attention. Try focusing on one task at a time.`
        });
    }
    
    return insights.slice(0, 6); // Show max 6 insights
}

function getContentTypeColor(type) {
    const colors = {
        'news': '#ef4444',
        'educational': '#3b82f6',
        'entertainment': '#f59e0b',
        'work': '#22c55e',
        'social': '#8b5cf6',
        'general': '#6b7280'
    };
    return colors[type] || '#6b7280';
}