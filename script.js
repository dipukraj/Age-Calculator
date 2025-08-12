// --- Utilities ---
const $ = (id) => document.getElementById(id);
const dobInputEl = $('dob');
const errorMessageEl = $('error-message');
const resultContainerEl = $('result-container');
const themeToggleBtn = $('theme-toggle');
const dobPlaceholderEl = $('dob-placeholder');
const dobPickerBtnEl = $('dob-picker-btn');

// Creator Information - Customize these!
const CREATOR_INFO = {
    name: "Dipu K Raj",
    website: "https://www.instagram.com/r.p.dipu",
    github: "https://github.com/dipukraj",
    linkedin: "https://www.linkedin.com/in/dipukraj/",
    portfolio: "https://dipukraj.me/"
};

// Set max date to today
dobInputEl.max = new Date().toISOString().split('T')[0];
function syncDobPlaceholder() {
    const shouldShow = !dobInputEl.value && document.activeElement !== dobInputEl;
    dobPlaceholderEl.style.display = shouldShow ? 'block' : 'none';
}
syncDobPlaceholder();

// Always start in light mode on load (ignore previous stored/system preference)
(function initTheme() {
    document.body.classList.remove('dark');
    themeToggleBtn.textContent = 'Dark Mode';
    // Ensure localStorage reflects current initial state
    try { localStorage.setItem('theme', 'light'); } catch (_) {}
})();

// Initialize animated background (only on desktop for better mobile performance)
if (window.innerWidth > 768) {
    createAnimatedBackground();
}

// Update creator information
// function updateCreatorInfo() {
//     $('creator-link').textContent = CREATOR_INFO.name;
//     $('creator-link').href = CREATOR_INFO.website;
//     $('footer-creator-link').textContent = CREATOR_INFO.name;
//     $('footer-creator-link').href = CREATOR_INFO.website;
//     
//     // Update social links
//     const socialLinks = document.querySelectorAll('.social-link');
//     socialLinks[0].href = CREATOR_INFO.github; // GitHub
//     socialLinks[1].href = CREATOR_INFO.linkedin; // LinkedIn
//     socialLinks[2].href = CREATOR_INFO.portfolio; // Portfolio
// }

// updateCreatorInfo();

themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    themeToggleBtn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

let tickerId = null;
let inputDebounceId = null;

function showResults() {
    if (!resultContainerEl.classList.contains('hidden')) return;
    resultContainerEl.classList.remove('hidden');
    requestAnimationFrame(() => {
        resultContainerEl.classList.add('is-visible');
    });
}

function hideResults() {
    if (resultContainerEl.classList.contains('hidden')) return;
    resultContainerEl.classList.remove('is-visible');
    const onEnd = () => {
        resultContainerEl.classList.add('hidden');
        resultContainerEl.removeEventListener('transitionend', onEnd);
    };
    resultContainerEl.addEventListener('transitionend', onEnd);
}

function animateNumber(el, toValue, duration = 400) {
    const startValue = Number(el.dataset.value || el.textContent.replace(/[,\s]/g, '') || 0);
    const endValue = Number(toValue);
    if (!isFinite(startValue) || !isFinite(endValue)) {
        el.textContent = String(toValue);
        el.dataset.value = String(endValue);
        return;
    }
    if (startValue === endValue) return;
    const startTime = performance.now();
    function step(now) {
        const t = Math.min(1, (now - startTime) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(startValue + (endValue - startValue) * eased);
        el.textContent = current.toLocaleString();
        el.dataset.value = String(current);
        if (t < 1) requestAnimationFrame(step);
        else {
            el.textContent = endValue.toLocaleString();
            el.dataset.value = String(endValue);
        }
    }
    requestAnimationFrame(step);
}

function validateDob(dob) {
    const today = new Date();
    if (!dob) {
        errorMessageEl.textContent = 'Please enter your date of birth.';
        return false;
    }
    if (dob > today) {
        errorMessageEl.textContent = 'Date cannot be in the future.';
        return false;
    }
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 130);
    if (dob < oldest) {
        errorMessageEl.textContent = 'Please enter a realistic date (less than 130 years ago).';
        return false;
    }
    return true;
}

function formatDateHuman(d) {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function weekdayName(d) {
    return d.toLocaleDateString(undefined, { weekday: 'long' });
}

function computeNextBirthday(dob, now) {
    const month = dob.getMonth();
    const day = dob.getDate();
    let year = now.getFullYear();

    // Handle Feb 29 on non-leap years -> Feb 28
    const isLeapDob = month === 1 && day === 29;
    let candidate = new Date(year, month, isLeapDob ? 28 : day);
    if (isLeapDob && (new Date(year, 1, 29).getDate() === 29)) {
        candidate = new Date(year, 1, 29);
    }
    if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        year += 1;
        candidate = new Date(year, month, isLeapDob ? 28 : day);
        if (isLeapDob && (new Date(year, 1, 29).getDate() === 29)) {
            candidate = new Date(year, 1, 29);
        }
    }
    const msPerDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfCandidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
    const daysLeft = Math.round((startOfCandidate - startOfToday) / msPerDay);
    return { date: candidate, daysLeft };
}

function calculateAgeParts(dob, now) {
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
        months -= 1;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }
    return { years, months, days };
}

function calculateTotals(dob, now) {
    const ms = now - dob;
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
    return { totalSeconds, totalMinutes, totalHours, totalDays };
}

// Confetti Animation (optimized for mobile)
function createConfetti() {
    const container = $('confetti-container');
    container.innerHTML = '';
    
    // Reduce confetti count on mobile for better performance
    const isMobile = window.innerWidth <= 768;
    const confettiCount = isMobile ? 20 : 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
    
    // Shorter duration on mobile
    const duration = isMobile ? 3000 : 5000;
    setTimeout(() => {
        container.innerHTML = '';
    }, duration);
}

// Animated Background (optimized for mobile)
function createAnimatedBackground() {
    const bg = $('animated-bg');
    bg.innerHTML = '';
    
    // Reduce particle count on mobile for better performance
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 10 : 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        bg.appendChild(particle);
    }
}

// Achievement Badges
function calculateAchievements(age) {
    const achievements = [
        { id: 'first-year', name: 'First Year', icon: '👶', age: 1, description: 'Survived first year!' },
        { id: 'toddler', name: 'Toddler', icon: '🚶', age: 3, description: 'Walking and talking' },
        { id: 'school-age', name: 'School Age', icon: '🎒', age: 6, description: 'Ready for school' },
        { id: 'preteen', name: 'Preteen', icon: '📱', age: 12, description: 'Digital native' },
        { id: 'teenager', name: 'Teenager', icon: '🎵', age: 13, description: 'Teen years begin' },
        { id: 'legal-adult', name: 'Legal Adult', icon: '🆔', age: 18, description: 'You can vote!' },
        { id: 'drinking-age', name: 'Drinking Age', icon: '🍺', age: 21, description: 'Legal to drink' },
        { id: 'quarter-century', name: 'Quarter Century', icon: '🎂', age: 25, description: '25 years young' },
        { id: 'thirties', name: 'Thirties', icon: '💼', age: 30, description: 'Career focused' },
        { id: 'forties', name: 'Forties', icon: '🏠', age: 40, description: 'Established' },
        { id: 'half-century', name: 'Half Century', icon: '🎯', age: 50, description: '50 years of wisdom' },
        { id: 'sixties', name: 'Sixties', icon: '🌅', age: 60, description: 'Golden years' },
        { id: 'seventies', name: 'Seventies', icon: '👴', age: 70, description: 'Senior wisdom' },
        { id: 'eighties', name: 'Eighties', icon: '🏆', age: 80, description: 'Eighty and thriving' },
        { id: 'nineties', name: 'Nineties', icon: '💎', age: 90, description: 'Diamond age' },
        { id: 'century', name: 'Century', icon: '👑', age: 100, description: 'Century mark!' }
    ];

    return achievements.map(achievement => ({
        ...achievement,
        unlocked: age >= achievement.age
    }));
}

// Life Timeline
function calculateLifeTimeline(dob, age) {
    const timeline = [
        { age: 0, event: 'Birth', date: dob, type: 'past' },
        { age: 1, event: 'First Steps', date: new Date(dob.getFullYear() + 1, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 3, event: 'Started Talking', date: new Date(dob.getFullYear() + 3, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 6, event: 'Started School', date: new Date(dob.getFullYear() + 6, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 12, event: 'Preteen Years', date: new Date(dob.getFullYear() + 12, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 18, event: 'Legal Adult', date: new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 21, event: 'Drinking Age', date: new Date(dob.getFullYear() + 21, dob.getMonth(), dob.getDate()), type: 'past' },
        { age: 25, event: 'Quarter Century', date: new Date(dob.getFullYear() + 25, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 30, event: 'Thirties Begin', date: new Date(dob.getFullYear() + 30, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 40, event: 'Forties Begin', date: new Date(dob.getFullYear() + 40, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 50, event: 'Half Century', date: new Date(dob.getFullYear() + 50, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 60, event: 'Sixties Begin', date: new Date(dob.getFullYear() + 60, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 70, event: 'Seventies Begin', date: new Date(dob.getFullYear() + 70, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 80, event: 'Eighties Begin', date: new Date(dob.getFullYear() + 80, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 90, event: 'Nineties Begin', date: new Date(dob.getFullYear() + 90, dob.getMonth(), dob.getDate()), type: 'future' },
        { age: 100, event: 'Century Mark', date: new Date(dob.getFullYear() + 100, dob.getMonth(), dob.getDate()), type: 'future' }
    ];

    return timeline.map(item => ({
        ...item,
        type: age >= item.age ? 'past' : 'future'
    }));
}

// Zodiac Sign Calculator
function getZodiacSign(month, day) {
    const zodiacSigns = [
        { name: 'Capricorn', icon: '♑', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19 },
        { name: 'Aquarius', icon: '♒', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
        { name: 'Pisces', icon: '♓', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
        { name: 'Aries', icon: '♈', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
        { name: 'Taurus', icon: '♉', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
        { name: 'Gemini', icon: '♊', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
        { name: 'Cancer', icon: '♋', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
        { name: 'Leo', icon: '♌', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
        { name: 'Virgo', icon: '♍', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
        { name: 'Libra', icon: '♎', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
        { name: 'Scorpio', icon: '♏', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
        { name: 'Sagittarius', icon: '♐', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 }
    ];

    for (let sign of zodiacSigns) {
        if (sign.startMonth === 12) {
            if ((month === 12 && day >= sign.startDay) || (month === 1 && day <= sign.endDay)) {
                return sign;
            }
        } else {
            if ((month === sign.startMonth && day >= sign.startDay) || 
                (month === sign.endMonth && day <= sign.endDay)) {
                return sign;
            }
        }
    }
    return zodiacSigns[0]; // Default to Capricorn
}

// Calculate Milestones
function calculateMilestones(age) {
    const milestones = [
        { age: 18, name: 'Legal Adult' },
        { age: 21, name: 'Drinking Age' },
        { age: 25, name: 'Quarter Century' },
        { age: 30, name: 'Thirties' },
        { age: 40, name: 'Forties' },
        { age: 50, name: 'Half Century' },
        { age: 60, name: 'Sixties' },
        { age: 70, name: 'Seventies' },
        { age: 80, name: 'Eighties' },
        { age: 90, name: 'Nineties' },
        { age: 100, name: 'Century' }
    ];

    const upcoming = milestones.filter(m => m.age > age).slice(0, 3);
    return upcoming.map(m => ({
        ...m,
        yearsLeft: m.age - age
    }));
}

// Calculate Countdown
function calculateCountdown(nextBirthday) {
    const now = new Date();
    const diff = nextBirthday - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
}

// Update Progress Bar
function updateProgressBar(age) {
    const averageLifeExpectancy = 75; // Global average
    const progress = Math.min((age / averageLifeExpectancy) * 100, 100);
    
    $('life-progress').style.width = progress + '%';
    $('progress-text').textContent = `${progress.toFixed(1)}% of average life expectancy`;
}

function render(dob) {
    const now = new Date();
    const age = calculateAgeParts(dob, now);
    const totals = calculateTotals(new Date(dob.getFullYear(), dob.getMonth(), dob.getDate()), now);
    const nextB = computeNextBirthday(dob, now);

    animateNumber($('years'), age.years, 350);
    animateNumber($('months'), age.months, 350);
    animateNumber($('days'), age.days, 350);

    animateNumber($('hoursTotal'), totals.totalHours, 350);
    animateNumber($('minutesTotal'), totals.totalMinutes, 350);
    animateNumber($('secondsTotal'), totals.totalSeconds, 350);

    $('next-birthday-date').textContent = formatDateHuman(nextB.date);
    $('next-birthday-weekday').textContent = weekdayName(nextB.date);
    $('days-until').textContent = nextB.daysLeft.toString();

    const turning = age.years + (nextB.daysLeft === 0 ? 0 : 1);
    $('next-birthday-date').setAttribute('title', `Turning ${turning}`);

    // Update all new features
    const zodiac = getZodiacSign(dob.getMonth() + 1, dob.getDate());
    $('zodiac-icon').textContent = zodiac.icon;
    $('zodiac-name').textContent = zodiac.name;
    $('zodiac-dates').textContent = `${zodiac.startMonth}/${zodiac.startDay} - ${zodiac.endMonth}/${zodiac.endDay}`;

    updateProgressBar(age.years);

    const milestones = calculateMilestones(age.years);
    const milestonesList = $('milestones-list');
    milestonesList.innerHTML = milestones.map(m => `
        <div class="milestone">
            <span class="milestone-age">${m.age} years</span>
            <span class="milestone-time">${m.yearsLeft} years left</span>
        </div>
    `).join('');

    const countdown = calculateCountdown(nextB.date);
    $('countdown-days').textContent = countdown.days;
    $('countdown-hours').textContent = countdown.hours;
    $('countdown-minutes').textContent = countdown.minutes;
    $('countdown-seconds').textContent = countdown.seconds;

    // Update achievements
    const achievements = calculateAchievements(age.years);
    const achievementsList = $('achievements-list');
    achievementsList.innerHTML = achievements.slice(0, 8).map(achievement => `
        <div class="badge ${achievement.unlocked ? 'unlocked' : 'locked'}" title="${achievement.description}">
            <span class="badge-icon">${achievement.icon}</span>
            <span>${achievement.name}</span>
        </div>
    `).join('');

    // Update timeline
    const timeline = calculateLifeTimeline(dob, age.years);
    const timelineList = $('life-timeline');
    timelineList.innerHTML = timeline.slice(0, 6).map(item => `
        <div class="timeline-item ${item.type}">
            <div class="timeline-age">${item.age} years</div>
            <div class="timeline-event">${item.event}</div>
            <div class="timeline-date">${item.date.toLocaleDateString()}</div>
        </div>
    `).join('');
    
    // Update new Visual Enhancements and Social Features
    enhanceAgeCalculation(dob, now);
}

function startTicker(dob) {
    if (tickerId) clearInterval(tickerId);
    
    // Optimize ticker for mobile - slower update on mobile for better performance
    const isMobile = window.innerWidth <= 768;
    const interval = isMobile ? 2000 : 1000; // 2 seconds on mobile, 1 second on desktop
    
    tickerId = setInterval(() => render(dob), interval);
}

function calculateAndShow() {
    const raw = dobInputEl.value;
    const dob = raw ? new Date(raw) : null;
    if (!validateDob(dob)) {
        errorMessageEl.style.display = 'block';
        hideResults();
        if (tickerId) { clearInterval(tickerId); tickerId = null; }
        return;
    }
    errorMessageEl.style.display = 'none';
    showResults();
    render(dob);
    startTicker(dob);
    
    // Trigger confetti on first calculation
    createConfetti();
}

$('calculate-btn').addEventListener('click', calculateAndShow);
dobInputEl.addEventListener('input', () => {
    clearTimeout(inputDebounceId);
    inputDebounceId = setTimeout(calculateAndShow, 150);
    syncDobPlaceholder();
});
dobInputEl.addEventListener('focus', syncDobPlaceholder);
dobInputEl.addEventListener('blur', syncDobPlaceholder);

// Calendar button opens native picker (where supported)
dobPickerBtnEl.addEventListener('click', () => {
    try {
        if (typeof dobInputEl.showPicker === 'function') {
            dobInputEl.showPicker();
        } else {
            dobInputEl.focus();
            dobInputEl.click();
        }
    } catch (_) {
        dobInputEl.focus();
        dobInputEl.click();
    }
});

// Copy and Share
$('copy-btn').addEventListener('click', async () => {
    const years = $('years').textContent;
    const months = $('months').textContent;
    const days = $('days').textContent;
    const hours = $('hoursTotal').textContent;
    const minutes = $('minutesTotal').textContent;
    const seconds = $('secondsTotal').textContent;
    const nextDate = $('next-birthday-date').textContent;
    const weekday = $('next-birthday-weekday').textContent;
    const daysLeft = $('days-until').textContent;
    const zodiacName = $('zodiac-name').textContent;
    const text = `My age is ${years} years, ${months} months, and ${days} days.\n` +
                 `Zodiac Sign: ${zodiacName}\n` +
                 `Total lived: ${hours} hours, ${minutes} minutes, ${seconds} seconds.\n` +
                 `Next birthday: ${nextDate} (${weekday}), ${daysLeft} days left.`;
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    } catch (_) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('Copied to clipboard!');
    }
});

$('share-btn').addEventListener('click', async () => {
    const years = $('years').textContent;
    const months = $('months').textContent;
    const days = $('days').textContent;
    const nextDate = $('next-birthday-date').textContent;
    const daysLeft = $('days-until').textContent;
    const zodiacName = $('zodiac-name').textContent;
    const title = 'My Age Result';
    const text = `I am ${years} years, ${months} months, and ${days} days old. Zodiac: ${zodiacName}. Next birthday: ${nextDate} (${daysLeft} days left).`;
    try {
        if (navigator.share) {
            await navigator.share({ title, text });
        } else {
            await navigator.clipboard.writeText(text);
            alert('Share not supported. Copied to clipboard instead.');
        }
    } catch (_) {
        // user cancelled or not supported
    }
});

    // ===== NEW VISUAL ENHANCEMENTS FUNCTIONALITY =====

    // Age in different units calculation
    function updateAgeUnits(ageInDays) {
        const minutes = ageInDays * 24 * 60;
        const seconds = minutes * 60;
        const heartbeats = seconds * 80; // Average 80 beats per minute
        const blinks = seconds * 0.033; // Average blink every 30 seconds

        $('age-minutes').textContent = formatLargeNumber(minutes);
        $('secondsTotal').textContent = formatLargeNumber(seconds);
        $('age-heartbeats').textContent = formatLargeNumber(Math.floor(heartbeats));
        $('age-blinks').textContent = formatLargeNumber(Math.floor(blinks));
    }

    // Format large numbers with commas
    function formatLargeNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Seasonal theme detection
    function updateSeasonalTheme() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        
        let season, icon, dates;
        
        if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
            season = "Spring";
            icon = "🌸";
            dates = "Mar 20 - Jun 20";
        } else if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day <= 22)) {
            season = "Summer";
            icon = "☀️";
            dates = "Jun 21 - Sep 22";
        } else if ((month === 9 && day >= 23) || month === 10 || month === 11 || (month === 12 && day <= 20)) {
            season = "Autumn";
            icon = "🍂";
            dates = "Sep 23 - Dec 20";
        } else {
            season = "Winter";
            icon = "❄️";
            dates = "Dec 21 - Mar 19";
        }
        
        $('season-icon').textContent = icon;
        $('season-name').textContent = season;
        $('season-dates').textContent = dates;
    }

    // Custom theme selector
    function initializeThemeSelector() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                themeOptions.forEach(opt => opt.classList.remove('active'));
                // Add active class to clicked option
                option.classList.add('active');
                
                const theme = option.dataset.theme;
                applyCustomTheme(theme);
            });
        });
        
        // Set default theme as active
        document.querySelector('[data-theme="default"]').classList.add('active');
    }

    // Apply custom themes
    function applyCustomTheme(theme) {
        const container = document.querySelector('.calculator-container');
        
        // Remove existing theme classes
        container.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest');
        
        if (theme !== 'default') {
            container.classList.add(`theme-${theme}`);
        }
        
        // Store theme preference
        localStorage.setItem('preferred-theme', theme);
    }

    // ===== NEW SOCIAL FEATURES FUNCTIONALITY =====

    // Initialize social features
    function initializeSocialFeatures() {
        // Age challenges
        initializeAgeChallenges();
        
        // Social content previews
        initializeSocialContent();
        
        // Achievement sharing
        initializeAchievementSharing();
    }

    // Age challenges functionality
    function initializeAgeChallenges() {
        // Share age in seconds
        $('share-seconds-btn').addEventListener('click', () => {
            const ageInSeconds = parseInt($('secondsTotal').textContent.replace(/,/g, ''));
            const text = `I'm exactly ${formatLargeNumber(ageInSeconds)} seconds old! ⏰ #AgeCalculator`;
            shareText(text);
        });
        
        // Share birthday countdown
        $('share-countdown-btn').addEventListener('click', () => {
            const daysLeft = $('days-until').textContent;
            const text = `My next birthday is in ${daysLeft} days! 🎂 #BirthdayCountdown`;
            shareText(text);
        });
        
        // Share milestone
        $('share-milestone-btn').addEventListener('click', () => {
            const years = $('years').textContent;
            const text = `Just reached ${years} years milestone! 🏆 #AgeMilestone`;
            shareText(text);
        });
    }

    // Social content functionality
    function initializeSocialContent() {
        // Instagram preview
        $('copy-instagram-btn').addEventListener('click', () => {
            const years = $('years').textContent;
            const months = $('months').textContent;
            const days = $('days').textContent;
            const text = `I'm exactly ${years} years, ${months} months, ${days} days old! 🎉`;
            copyToClipboard(text);
            showCopySuccess('Instagram text copied!');
        });
        
        // Twitter preview
        $('copy-twitter-btn').addEventListener('click', () => {
            const years = $('years').textContent;
            const daysLeft = $('days-until').textContent;
            const progress = document.querySelector('#life-progress').style.width;
            const text = `Age: ${years} years | Next birthday in ${daysLeft} days | Life progress: ${progress} 🚀`;
            copyToClipboard(text);
            showCopySuccess('Twitter text copied!');
        });
        
        // WhatsApp preview
        $('copy-whatsapp-btn').addEventListener('click', () => {
            const years = $('years').textContent;
            const months = $('months').textContent;
            const days = $('days').textContent;
            const text = `🎂 My age journey: ${years} years, ${months} months, ${days} days! #AgeCalculator`;
            copyToClipboard(text);
            showCopySuccess('WhatsApp text copied!');
        });
    }

    // Achievement sharing functionality
    function initializeAchievementSharing() {
        // First time user achievement
        $('share-first-user-btn').addEventListener('click', () => {
            const text = `Just discovered this amazing Age Calculator! ✨ #FirstTimeUser #AgeCalculator`;
            shareText(text);
        });
        
        // Milestone achievement
        $('share-milestone-achievement-btn').addEventListener('click', () => {
            const years = $('years').textContent;
            const text = `Reached ${years} years milestone! 🎯 #MilestoneAchievement #AgeCalculator`;
            shareText(text);
        });
        
        // Zodiac discovery
        $('share-zodiac-btn').addEventListener('click', () => {
            const zodiacName = $('zodiac-name').textContent;
            const text = `Just discovered I'm a ${zodiacName}! 🌟 #ZodiacDiscovery #AgeCalculator`;
            shareText(text);
        });
    }

    // Utility functions for social features
    function shareText(text) {
        if (navigator.share) {
            navigator.share({
                title: 'My Age Calculation',
                text: text,
                url: 'https://dipukraj.me/age-calculator' // Use your actual website URL
            });
        } else {
            // Fallback: copy to clipboard
            copyToClipboard(text);
            showCopySuccess('Text copied! Share it manually.');
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Text copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }

    function showCopySuccess(message) {
        // Create a temporary success message
        const successMsg = document.createElement('div');
        successMsg.textContent = message;
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(successMsg);
        
        // Remove after 3 seconds
        setTimeout(() => {
            successMsg.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(successMsg);
            }, 300);
        }, 3000);
    }

    // ===== INITIALIZATION =====

    // Initialize new features when page loads
    document.addEventListener('DOMContentLoaded', () => {
        // Existing initialization code...
        
        // Initialize new features
        initializeThemeSelector();
        initializeSocialFeatures();
        updateSeasonalTheme();
        
        // Load saved theme preference
        const savedTheme = localStorage.getItem('preferred-theme');
        if (savedTheme && savedTheme !== 'default') {
            applyCustomTheme(savedTheme);
            document.querySelector(`[data-theme="${savedTheme}"]`).classList.add('active');
        }

        // Initialize Height & Weight Calculator
        initializeHeightWeightCalculator();
    });

    // Age calculation enhancement functions
    function enhanceAgeCalculation(dob, now) {
        const ageInDays = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
        updateAgeUnits(ageInDays);
        updateSocialContent();
    }

    // Update social content previews
    function updateSocialContent() {
        const years = $('years').textContent;
        const months = $('months').textContent;
        const days = $('days').textContent;
        const daysLeft = $('days-until').textContent;
        const progress = document.querySelector('#life-progress').style.width;
        
        // Update Instagram preview
        const instagramText = `I'm exactly ${years} years, ${months} months, ${days} days old! 🎉`;
        document.querySelector('#instagram-preview .preview-text').textContent = instagramText;
        
        // Update Twitter preview
        const twitterText = `Age: ${years} years | Next birthday in ${daysLeft} days | Life progress: ${progress} 🚀`;
        document.querySelector('#twitter-preview .preview-text').textContent = twitterText;
        
        // Update WhatsApp preview
        const whatsappText = `🎂 My age journey: ${years} years, ${months} months, ${days} days! #AgeCalculator`;
        document.querySelector('#whatsapp-preview .preview-text').textContent = whatsappText;
    }

// Height & Weight Calculator Functions
function initializeHeightWeightCalculator() {
    const calculateBtn = document.getElementById('calculate-hw-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateHealthStatus);
    }
}

function calculateHealthStatus() {
    const gender = document.getElementById('gender-select').value;
    const height = parseFloat(document.getElementById('height-input').value);
    const weight = parseFloat(document.getElementById('weight-input').value);
    const heightUnit = document.getElementById('height-unit').value;
    const weightUnit = document.getElementById('weight-unit').value;

    if (!gender || !height || !weight) {
        alert('Please fill in all fields');
        return;
    }

    // Convert units to standard (cm and kg)
    const heightCm = heightUnit === 'ft' ? height * 30.48 : height;
    const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;

    // Calculate BMI
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    // Calculate percentiles based on age and gender
    const age = calculateAgeFromDOB();
    const heightPercentile = calculateHeightPercentile(heightCm, age, gender);
    const weightPercentile = calculateWeightPercentile(weightKg, heightCm, age, gender);

    // Display results
    displayHealthResults(bmi, heightPercentile, weightPercentile, heightCm, weightKg);
}

function calculateAgeFromDOB() {
    const dobInput = document.getElementById('dob');
    if (!dobInput.value) return 25; // Default age if DOB not set
    
    const dob = new Date(dobInput.value);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        return age - 1;
    }
    return age;
}

function calculateHeightPercentile(heightCm, age, gender) {
    // Simplified height percentile calculation based on WHO standards
    let expectedHeight;
    
    if (gender === 'male') {
        if (age <= 18) {
            expectedHeight = 170 + (age - 18) * 0.5; // Adult male average
        } else {
            expectedHeight = 175; // Adult male average
        }
    } else {
        if (age <= 18) {
            expectedHeight = 160 + (age - 18) * 0.5; // Adult female average
        } else {
            expectedHeight = 162; // Adult female average
        }
    }
    
    const difference = heightCm - expectedHeight;
    const standardDeviation = 7; // Approximate standard deviation
    const zScore = difference / standardDeviation;
    
    // Convert Z-score to percentile
    return Math.round((0.5 + 0.5 * Math.erf(zScore / Math.sqrt(2))) * 100);
}

function calculateWeightPercentile(weightKg, heightCm, age, gender) {
    // Calculate ideal weight using various formulas
    const heightM = heightCm / 100;
    
    // Devine formula for ideal weight
    let idealWeight;
    if (gender === 'male') {
        idealWeight = 50 + 2.3 * ((heightCm - 152.4) / 2.54);
    } else {
        idealWeight = 45.5 + 2.3 * ((heightCm - 152.4) / 2.54);
    }
    
    const difference = weightKg - idealWeight;
    const standardDeviation = 8; // Approximate standard deviation
    const zScore = difference / standardDeviation;
    
    // Convert Z-score to percentile
    return Math.round((0.5 + 0.5 * Math.erf(zScore / Math.sqrt(2))) * 100);
}

// Math.erf approximation
Math.erf = function(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
};

function displayHealthResults(bmi, heightPercentile, weightPercentile, heightCm, weightKg) {
    const resultsDiv = document.getElementById('hw-results');
    const bmiValue = document.getElementById('bmi-value');
    const bmiStatus = document.getElementById('bmi-status');
    const heightPercentileEl = document.getElementById('height-percentile');
    const heightStatus = document.getElementById('height-status');
    const weightPercentileEl = document.getElementById('weight-percentile');
    const weightStatus = document.getElementById('weight-status');
    const recommendations = document.getElementById('hw-recommendations');

    // Display BMI
    bmiValue.textContent = bmi.toFixed(1);
    if (bmi < 18.5) {
        bmiStatus.textContent = 'Underweight';
        bmiStatus.className = 'hw-result-status attention';
    } else if (bmi < 25) {
        bmiStatus.textContent = 'Normal';
        bmiStatus.className = 'hw-result-status healthy';
    } else if (bmi < 30) {
        bmiStatus.textContent = 'Overweight';
        bmiStatus.className = 'hw-result-status warning';
    } else {
        bmiStatus.textContent = 'Obese';
        bmiStatus.className = 'hw-result-status attention';
    }

    // Display Height Percentile
    heightPercentileEl.textContent = heightPercentile + '%';
    if (heightPercentile < 25) {
        heightStatus.textContent = 'Below Average';
        heightStatus.className = 'hw-result-status attention';
    } else if (heightPercentile < 75) {
        heightStatus.textContent = 'Average';
        heightStatus.className = 'hw-result-status healthy';
    } else {
        heightStatus.textContent = 'Above Average';
        heightStatus.className = 'hw-result-status healthy';
    }

    // Display Weight Percentile
    weightPercentileEl.textContent = weightPercentile + '%';
    if (weightPercentile < 25) {
        weightStatus.textContent = 'Below Average';
        weightStatus.className = 'hw-result-status attention';
    } else if (weightPercentile < 75) {
        weightStatus.textContent = 'Average';
        weightStatus.className = 'hw-result-status healthy';
    } else {
        weightStatus.textContent = 'Above Average';
        weightStatus.className = 'hw-result-status warning';
    }

    // Generate recommendations
    generateHealthRecommendations(bmi, heightPercentile, weightPercentile, recommendations);

    // Show results
    resultsDiv.classList.remove('hidden');
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function generateHealthRecommendations(bmi, heightPercentile, weightPercentile, recommendationsEl) {
    let recommendations = [];
    
    // BMI-based recommendations
    if (bmi < 18.5) {
        recommendations.push('Consider increasing your caloric intake with healthy foods');
        recommendations.push('Include protein-rich foods in your diet');
        recommendations.push('Consult a nutritionist for personalized advice');
    } else if (bmi >= 25) {
        recommendations.push('Focus on balanced nutrition and portion control');
        recommendations.push('Increase physical activity to 150+ minutes per week');
        recommendations.push('Consider consulting a healthcare provider');
    } else {
        recommendations.push('Maintain your current healthy lifestyle');
        recommendations.push('Continue regular exercise and balanced diet');
    }

    // Height-based recommendations
    if (heightPercentile < 25) {
        recommendations.push('Ensure adequate nutrition for optimal growth');
        recommendations.push('Get sufficient sleep (7-9 hours)');
        recommendations.push('Include calcium-rich foods in your diet');
    }

    // Weight-based recommendations
    if (weightPercentile < 25) {
        recommendations.push('Focus on nutrient-dense foods');
        recommendations.push('Consider strength training exercises');
    } else if (weightPercentile >= 75) {
        recommendations.push('Monitor portion sizes');
        recommendations.push('Increase cardiovascular exercise');
    }

    // Display recommendations
    recommendationsEl.innerHTML = `
        <h5>💡 Health Recommendations</h5>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    `;
}
