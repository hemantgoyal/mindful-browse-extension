const WELLNESS_CATEGORIES = {
    PRODUCTIVE: { score: 1.0, color: '#22c55e', name: 'Productive' },
    EDUCATIONAL: { score: 0.9, color: '#3b82f6', name: 'Educational' },
    NEUTRAL: { score: 0.7, color: '#f59e0b', name: 'Neutral' },
    SOCIAL: { score: 0.4, color: '#f97316', name: 'Social' },
    ENTERTAINMENT: { score: 0.2, color: '#ef4444', name: 'Entertainment' },
    UNKNOWN: { score: 0.5, color: '#6b7280', name: 'Unknown' }
};

document.addEventListener('DOMContentLoaded', function() {
    loadAndUpdateUI();
    
    // Set up event listeners
    document.getElementById('take-break-btn').addEventListener('click', suggestBreak);
    document.getElementById('focus-mode-btn').addEventListener('click', toggleFocusMode);
    
    // Refresh UI every 30 seconds
    setInterval(loadAndUpdateUI, 30000);
});

function loadAndUpdateUI() {
    chrome.storage.local.get(['dailyData', 'weeklyStats'], function(result) {
        if (result.dailyData) {
            updateUI(result.dailyData, result.weeklyStats || []);
        }
    });
}

function updateUI(data, weeklyStats) {
    updateWellnessScore(data, weeklyStats);
    updateMetrics(data);
    updateCategoryBreakdown(data);
    updateInsights(data);
    updateWeeklyChart(weeklyStats);
}

function updateWellnessScore(data, weeklyStats) {
    const scoreElement = document.getElementById('score-number');
    const trendElement = document.getElementById('score-trend');
    
    if (scoreElement) {
        scoreElement.textContent = data.wellnessScore || 75;
        
        // Update circle color based on score
        const circle = scoreElement.parentElement;
        if (data.wellnessScore >= 80) {
            circle.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        } else if (data.wellnessScore >= 60) {
            circle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        } else {
            circle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
    }
    
    if (trendElement && weeklyStats.length > 0) {
        const yesterday = weeklyStats[weeklyStats.length - 1];
        const trend = data.wellnessScore - (yesterday?.wellnessScore || 75);
        const trendIcon = trend > 0 ? '↗' : trend < 0 ? '↘' : '→';
        const trendText = trend > 0 ? `+${trend}` : trend.toString();
        trendElement.textContent = `${trendIcon} ${trendText} from yesterday`;
        trendElement.style.color = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#6b7280';
    }
}

function updateMetrics(data) {
    // Active time
    const activeTimeElement = document.getElementById('active-time');
    if (activeTimeElement) {
        const hours = Math.floor((data.totalTime || 0) / 3600000);
        const minutes = Math.floor(((data.totalTime || 0) % 3600000) / 60000);
        activeTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    // Focus time
    const focusTimeElement = document.getElementById('focus-time');
    if (focusTimeElement) {
        const hours = Math.floor((data.focusTime || 0) / 3600000);
        const minutes = Math.floor(((data.focusTime || 0) % 3600000) / 60000);
        focusTimeElement.textContent = `${hours}h ${minutes}m`;
    }
    
    // Tab switches
    const tabSwitchesElement = document.getElementById('tab-switches');
    if (tabSwitchesElement) {
        tabSwitchesElement.textContent = data.tabSwitches || 0;
    }
    
    // Distraction events
    const distractionElement = document.getElementById('distraction-events');
    if (distractionElement) {
        distractionElement.textContent = data.distractionEvents || 0;
    }
}

function updateCategoryBreakdown(data) {
    const categoryList = document.getElementById('category-list');
    if (!categoryList || !data.categoryBreakdown) return;
    
    categoryList.innerHTML = '';
    
    const totalTime = data.totalTime || 0;
    if (totalTime === 0) {
        categoryList.innerHTML = '<p class="no-data">No activity yet today</p>';
        return;
    }
    
    // Sort categories by time spent
    const sortedCategories = Object.entries(data.categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Show top 5 categories
    
    sortedCategories.forEach(([category, time]) => {
        const percentage = Math.round((time / totalTime) * 100);
        const hours = Math.floor(time / 3600000);
        const minutes = Math.floor((time % 3600000) / 60000);
        
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item';
        categoryElement.innerHTML = `
            <div class="category-info">
                <div class="category-color" style="background-color: ${WELLNESS_CATEGORIES[category]?.color || '#6b7280'}"></div>
                <span class="category-name">${WELLNESS_CATEGORIES[category]?.name || category}</span>
            </div>
            <div class="category-stats">
                <span class="category-time">${hours}h ${minutes}m</span>
                <span class="category-percentage">${percentage}%</span>
            </div>
        `;
        categoryList.appendChild(categoryElement);
    });
}

function updateInsights(data) {
    const insightList = document.getElementById('insight-list');
    if (!insightList) return;
    
    insightList.innerHTML = '';
    
    const insights = generateInsights(data);
    
    insights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = `insight-item ${insight.type}`;
        insightElement.innerHTML = `
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `;
        insightList.appendChild(insightElement);
    });
}

function generateInsights(data) {
    const insights = [];
    
    // Wellness score insights
    if (data.wellnessScore >= 80) {
        insights.push({
            type: 'positive',
            icon: '🎯',
            title: 'Great Focus!',
            description: 'Your wellness score is excellent. Keep up the productive browsing!'
        });
    } else if (data.wellnessScore < 50) {
        insights.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Low Wellness Score',
            description: 'Consider spending more time on productive activities.'
        });
    }
    
    // Focus time insights
    if ((data.focusTime || 0) > 7200000) { // 2+ hours
        insights.push({
            type: 'positive',
            icon: '🔥',
            title: 'Focus Champion!',
            description: 'You\'ve had great focus sessions today.'
        });
    }
    
    // Tab switching insights
    if (data.tabSwitches > 100) {
        insights.push({
            type: 'warning',
            icon: '🔄',
            title: 'High Tab Activity',
            description: 'Try to reduce tab switching for better focus.'
        });
    }
    
    // Category-specific insights
    if (data.categoryBreakdown) {
        const socialTime = data.categoryBreakdown['SOCIAL'] || 0;
        const totalTime = data.totalTime || 0;
        
        if (socialTime > totalTime * 0.3) { // More than 30% social
            insights.push({
                type: 'info',
                icon: '📱',
                title: 'Social Media Usage',
                description: 'Consider balancing social media with productive activities.'
            });
        }
    }
    
    return insights.slice(0, 3); // Show max 3 insights
}

function updateWeeklyChart(weeklyStats) {
    const chartContainer = document.getElementById('weekly-chart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = '';
    
    if (weeklyStats.length === 0) {
        chartContainer.innerHTML = '<p class="no-data">No weekly data available</p>';
        return;
    }
    
    const maxScore = Math.max(...weeklyStats.map(day => day.wellnessScore), 100);
    
    weeklyStats.forEach((day, index) => {
        const dayElement = document.createElement('div');
        dayElement.className = 'chart-day';
        
        const barHeight = (day.wellnessScore / maxScore) * 100;
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        dayElement.innerHTML = `
            <div class="chart-bar" style="height: ${barHeight}%; background-color: ${getScoreColor(day.wellnessScore)}"></div>
            <div class="chart-label">${dayName}</div>
            <div class="chart-score">${day.wellnessScore}</div>
        `;
        
        chartContainer.appendChild(dayElement);
    });
}

function getScoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
}

function suggestBreak() {
    const breakSuggestions = [
        "Take a 5-minute walk",
        "Do some deep breathing exercises",
        "Stretch your neck and shoulders",
        "Look away from the screen for 20 seconds",
        "Drink a glass of water",
        "Do some quick desk exercises"
    ];
    
    const randomSuggestion = breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)];
    alert(`Break Time! 🧘‍♀️\n\n${randomSuggestion}`);
}

function toggleFocusMode() {
    // This could be expanded to implement actual focus mode functionality
    // For now, just show a notification
    alert('Focus Mode activated! 🎯\n\nMinimize distractions and focus on your most important tasks.');
}
