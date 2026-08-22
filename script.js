// --- Helper Utilities ---
const $ = (id) => document.getElementById(id);

// Core DOM References
const dobInputEl = $('dob');
const errorMessageEl = $('error-message');
const resultContainerEl = $('result-container');
const themeToggleBtn = $('theme-toggle');
const dobPickerBtnEl = $('dob-picker-btn');
const calculateBtn = $('calculate-btn');

// State Variables
let liveTickerAnimationId = null;
let currentDob = null;

// Set max date to today
if (dobInputEl) {
    dobInputEl.max = new Date().toISOString().split('T')[0];
}

// --- Theme Controller ---
function initTheme() {
    const savedTheme = localStorage.getItem('app-theme-style') || 'default';
    const isDark = localStorage.getItem('theme-mode') === 'dark';

    if (isDark) {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i><span class="theme-text">Light Mode</span>';
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i><span class="theme-text">Dark Mode</span>';
        }
    }

    applyCustomThemeStyle(savedTheme);
}

function applyCustomThemeStyle(theme) {
    document.body.classList.remove('theme-ocean', 'theme-sunset', 'theme-forest');
    if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('app-theme-style', theme);

    // Update active state in theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- Tab System Controller ---
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = $(targetTab);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
}

// --- Number Animation Utility ---
function animateNumber(el, toValue, duration = 400) {
    if (!el) return;
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

// --- Date Validation ---
function validateDob(dob) {
    const today = new Date();
    if (!dob) {
        if (errorMessageEl) errorMessageEl.textContent = 'Please select your date of birth.';
        return false;
    }
    if (dob > today) {
        if (errorMessageEl) errorMessageEl.textContent = 'Date cannot be in the future.';
        return false;
    }
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 130);
    if (dob < oldest) {
        if (errorMessageEl) errorMessageEl.textContent = 'Please enter a realistic date (less than 130 years ago).';
        return false;
    }
    return true;
}

// --- Calculations Core ---
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
    return { totalSeconds, totalMinutes, totalHours, totalDays, ms };
}

function computeNextBirthday(dob, now) {
    const month = dob.getMonth();
    const day = dob.getDate();
    let year = now.getFullYear();

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

// --- Live Real-Time Precision Millisecond Ticker ---
function startLiveMillisecondTicker(dob) {
    if (liveTickerAnimationId) cancelAnimationFrame(liveTickerAnimationId);

    const tickerEl = $('live-ms-ticker');
    if (!tickerEl) return;

    function update() {
        const now = new Date();
        const diffMs = now - dob;

        const msPerSecond = 1000;
        const msPerMinute = 60 * msPerSecond;
        const msPerHour = 60 * msPerMinute;
        const msPerDay = 24 * msPerHour;
        const msPerYear = 365.25 * msPerDay;

        const years = Math.floor(diffMs / msPerYear);
        let rem = diffMs % msPerYear;

        const days = Math.floor(rem / msPerDay);
        rem %= msPerDay;

        const hours = Math.floor(rem / msPerHour);
        rem %= msPerHour;

        const minutes = Math.floor(rem / msPerMinute);
        rem %= msPerMinute;

        const seconds = Math.floor(rem / msPerSecond);
        const milliseconds = rem % msPerSecond;

        tickerEl.textContent = `${years}y ${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;

        liveTickerAnimationId = requestAnimationFrame(update);
    }

    liveTickerAnimationId = requestAnimationFrame(update);
}

// --- Day of Birth Trivia ---
function updateDayOfBirthTrivia(dob) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = daysOfWeek[dob.getDay()];

    const triviaList = {
        'Sunday': 'Ruled by the Sun. Sunday births are radiant, ambitious, bold, and natural leaders.',
        'Monday': 'Ruled by the Moon. Monday births are gentle, intuitive, imaginative, and deeply compassionate.',
        'Tuesday': 'Ruled by Mars. Tuesday births are passionate, courageous, energetic, and goal-driven.',
        'Wednesday': 'Ruled by Mercury. Wednesday births are witty, communicative, versatile, and quick thinkers.',
        'Thursday': 'Ruled by Jupiter. Thursday births are generous, optimistic, wise, and adventure seekers.',
        'Friday': 'Ruled by Venus. Friday births are artistic, romantic, charming, and lovers of beauty.',
        'Saturday': 'Ruled by Saturn. Saturday births are disciplined, resilient, wise, and grounded.'
    };

    if ($('born-day-name')) $('born-day-name').textContent = dayName;
    if ($('born-day-desc')) $('born-day-desc').textContent = `You were born on a ${dayName}! ${triviaList[dayName]}`;
}

// --- Planetary / Cosmic Age ---
function updatePlanetaryAge(totalDays) {
    const planets = [
        { name: 'Mercury', emoji: '☿️', ratio: 0.2408467, desc: '88 Earth Days / Orbit' },
        { name: 'Venus', emoji: '♀️', ratio: 0.615197, desc: '225 Earth Days / Orbit' },
        { name: 'Earth', emoji: '🌍', ratio: 1.0, desc: '365.25 Days / Orbit' },
        { name: 'Moon (Lunar Cycles)', emoji: '🌙', ratio: 29.53 / 365.25, desc: 'Lunar Synodic Cycles' },
        { name: 'Mars', emoji: '♂️', ratio: 1.8808158, desc: '687 Earth Days / Orbit' },
        { name: 'Jupiter', emoji: '♃', ratio: 11.862615, desc: '11.9 Earth Years / Orbit' },
        { name: 'Saturn', emoji: '♄', ratio: 29.4571, desc: '29.5 Earth Years / Orbit' },
        { name: 'Uranus', emoji: '♅', ratio: 84.0205, desc: '84 Earth Years / Orbit' },
        { name: 'Neptune', emoji: '♆', ratio: 164.79, desc: '165 Earth Years / Orbit' }
    ];

    const earthYears = totalDays / 365.25;
    const gridEl = $('planetary-grid');
    if (!gridEl) return;

    gridEl.innerHTML = planets.map(p => {
        const planetAge = (earthYears / p.ratio).toFixed(2);
        return `
            <div class="planet-card">
                <span class="planet-emoji">${p.emoji}</span>
                <div class="planet-info">
                    <span class="planet-name">${p.name}</span>
                    <span class="planet-age">${planetAge} Yrs</span>
                    <span class="planet-sub">${p.desc}</span>
                </div>
            </div>
        `;
    }).join('');
}

// --- Vitals Counter ---
function updateVitals(totals) {
    const minutes = totals.totalMinutes;
    const seconds = totals.totalSeconds;
    const days = totals.totalDays;

    const heartbeats = Math.floor(minutes * 75); // Avg 75 bpm
    const blinks = Math.floor(minutes * 15); // Avg 15 blinks/min
    const breaths = Math.floor(minutes * 16); // Avg 16 breaths/min
    const sleepYears = (days * (8 / 24) / 365.25).toFixed(1); // 8 hrs sleep per day

    if ($('age-heartbeats')) $('age-heartbeats').textContent = heartbeats.toLocaleString();
    if ($('age-blinks')) $('age-blinks').textContent = blinks.toLocaleString();
    if ($('age-breaths')) $('age-breaths').textContent = breaths.toLocaleString();
    if ($('age-sleep-yrs')) $('age-sleep-yrs').textContent = `${sleepYears} Yrs`;
}

// --- Zodiac Sign Calculator ---
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
            if ((month === sign.startMonth && day >= sign.startDay) || (month === sign.endMonth && day <= sign.endDay)) {
                return sign;
            }
        }
    }
    return zodiacSigns[0];
}

// --- Astrology Predictions Engine ---
function updateAstrology(dob) {
    const sunSign = getZodiacSign(dob.getMonth() + 1, dob.getDate());
    const hour = parseInt($('birth-hour')?.value) || 12;
    const minute = parseInt($('birth-minute')?.value) || 0;

    const moonSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const risingSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

    const dayOfYear = Math.floor((dob - new Date(dob.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const moonIndex = Math.floor((dayOfYear + hour / 24) / 2.5) % 12;
    const risingIndex = Math.floor((dob.getMonth() * 2 + hour / 2) % 12);

    const moonSign = moonSigns[moonIndex];
    const risingSign = risingSigns[risingIndex];

    if ($('zodiac-icon')) $('zodiac-icon').textContent = sunSign.icon;
    if ($('zodiac-name')) $('zodiac-name').textContent = sunSign.name;
    if ($('zodiac-dates')) $('zodiac-dates').textContent = `${sunSign.startMonth}/${sunSign.startDay} - ${sunSign.endMonth}/${sunSign.endDay}`;
    if ($('moon-sign')) $('moon-sign').textContent = moonSign;
    if ($('rising-sign')) $('rising-sign').textContent = risingSign;

    // Season Detection
    const month = dob.getMonth() + 1;
    let season = "Spring";
    if (month >= 6 && month <= 8) season = "Summer";
    else if (month >= 9 && month <= 11) season = "Autumn";
    else if (month === 12 || month <= 2) season = "Winter";
    if ($('season-name')) $('season-name').textContent = season;

    // Content Population
    if ($('love-prediction')) $('love-prediction').textContent = `Your ${sunSign.name} energy radiates passion and loyalty. With ${moonSign} Moon, you thrive when emotional depth and trust are nurtured.`;
    if ($('love-remedy')) $('love-remedy').textContent = `✨ Tip: Express feelings openly and practice listening. Wear pastel shades on Fridays.`;

    if ($('study-prediction')) $('study-prediction').textContent = `Driven by your ${risingSign} Rising, you excel in problem-solving and leadership roles. Focus on structured study routines.`;
    if ($('study-remedy')) $('study-remedy').textContent = `✨ Tip: Study in 45-minute sprint blocks with quick physical stretch breaks.`;

    if ($('challenge-prediction')) $('challenge-prediction').textContent = `Your key life challenge is balancing high ambitions with patience. Avoid impulsive reactions under stress.`;
    if ($('challenge-remedy')) $('challenge-remedy').textContent = `✨ Tip: Practice 5 minutes of mindful breathing daily.`;

    if ($('lucky-elements')) {
        $('lucky-elements').innerHTML = `
            <div class="lucky-element"><div class="lucky-element-label">Lucky Color</div><div class="lucky-element-value">Violet & Blue</div></div>
            <div class="lucky-element"><div class="lucky-element-label">Lucky Numbers</div><div class="lucky-element-value">3, 7, 9</div></div>
            <div class="lucky-element"><div class="lucky-element-label">Lucky Day</div><div class="lucky-element-value">Wednesday</div></div>
            <div class="lucky-element"><div class="lucky-element-label">Gemstone</div><div class="lucky-element-value">Sapphire</div></div>
        `;
    }

    if ($('daily-horoscope')) {
        $('daily-horoscope').textContent = `🌟 ${sunSign.name} Horoscope Today: Your creative energy is soaring! A great day to start new projects, communicate bold ideas, and spend time with loved ones. Trust your instincts.`;
    }
}

// --- Health / BMI Calculator Engine ---
function calculateHealthStatus() {
    const gender = $('gender-select')?.value || 'male';
    const height = parseFloat($('height-input')?.value) || 175;
    const weight = parseFloat($('weight-input')?.value) || 70;
    const heightUnit = $('height-unit')?.value || 'cm';
    const weightUnit = $('weight-unit')?.value || 'kg';

    const heightCm = heightUnit === 'ft' ? height * 30.48 : height;
    const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    const bmiValEl = $('bmi-value');
    const bmiStatusEl = $('bmi-status');
    const heightPercEl = $('height-percentile');
    const weightPercEl = $('weight-percentile');
    const hwResultsEl = $('hw-results');

    if (bmiValEl) bmiValEl.textContent = bmi.toFixed(1);

    let statusText = 'Normal';
    let statusClass = 'healthy';
    if (bmi < 18.5) { statusText = 'Underweight'; statusClass = 'attention'; }
    else if (bmi >= 25 && bmi < 30) { statusText = 'Overweight'; statusClass = 'warning'; }
    else if (bmi >= 30) { statusText = 'Obese'; statusClass = 'attention'; }

    if (bmiStatusEl) {
        bmiStatusEl.textContent = statusText;
        bmiStatusEl.className = `hw-result-status ${statusClass}`;
    }

    const heightPerc = Math.min(99, Math.max(1, Math.round((heightCm - 150) * 2.5)));
    const weightPerc = Math.min(99, Math.max(1, Math.round((weightKg - 40) * 1.5)));

    if (heightPercEl) heightPercEl.textContent = `${heightPerc}%`;
    if (weightPercEl) weightPercEl.textContent = `${weightPerc}%`;

    if (hwResultsEl) hwResultsEl.classList.remove('hidden');
}

// --- Timeline & Love Line ---
function updateLoveLifeLine(ageYears) {
    const status = $('relationship-status')?.value || 'single';
    const duration = parseFloat($('relationship-duration')?.value) || 0;
    const totalRels = parseFloat($('total-relationships')?.value) || 0;

    let loveAge = duration + (totalRels > 1 ? (totalRels - 1) * 2 : 0);
    let singleTime = Math.max(0, ageYears - loveAge);
    let lovePct = ageYears > 0 ? ((loveAge / ageYears) * 100).toFixed(1) : 0;

    if ($('love-age')) $('love-age').textContent = loveAge.toFixed(1);
    if ($('single-time')) $('single-time').textContent = singleTime.toFixed(1);
    if ($('love-percentage')) $('love-percentage').textContent = `${lovePct}%`;

    if ($('love-insights')) {
        $('love-insights').innerHTML = `
            <strong>💭 Life & Relationship Dynamics:</strong><br>
            You have spent ~${lovePct}% of your lifetime in romantic relationships or active growth phases. Whether single or committed, your personal freedom and emotional wisdom continue to evolve beautifully!
        `;
    }
}

function updateMilestonesAndBadges(ageYears, dob) {
    const milestones = [18, 21, 25, 30, 40, 50, 60, 75, 100];
    const upcoming = milestones.filter(m => m > ageYears).slice(0, 4);

    if ($('milestones-list')) {
        $('milestones-list').innerHTML = upcoming.map(m => `
            <div class="milestone">
                <div class="milestone-age">${m} Years Old</div>
                <div class="milestone-time">${m - ageYears} Years Left</div>
            </div>
        `).join('');
    }

    const badges = [
        { name: 'First Steps', icon: '👶', age: 1 },
        { name: 'Legal Adult', icon: '🆔', age: 18 },
        { name: 'Quarter Century', icon: '🎂', age: 25 },
        { name: 'Thirties Club', icon: '💼', age: 30 },
        { name: 'Half Century', icon: '🎯', age: 50 },
        { name: 'Golden Jubilee', icon: '👑', age: 60 }
    ];

    if ($('achievements-list')) {
        $('achievements-list').innerHTML = badges.map(b => `
            <div class="badge ${ageYears >= b.age ? 'unlocked' : ''}">
                <span class="badge-icon">${b.icon}</span>
                <span>${b.name}</span>
            </div>
        `).join('');
    }

    const timelineEvents = [
        { age: 0, title: 'Born into the world', date: dob.getFullYear() },
        { age: 18, title: 'Reached Adulthood', date: dob.getFullYear() + 18 },
        { age: 25, title: 'Quarter Century Milestone', date: dob.getFullYear() + 25 },
        { age: 50, title: 'Golden Milestone', date: dob.getFullYear() + 50 }
    ];

    if ($('life-timeline')) {
        $('life-timeline').innerHTML = timelineEvents.map(e => `
            <div class="timeline-item ${ageYears >= e.age ? 'past' : 'future'}">
                <strong>${e.age} Yrs - ${e.title}</strong>
                <span>${e.date}</span>
            </div>
        `).join('');
    }
}

// --- Story Poster Generator ---
function updateStoryPoster(age, zodiac, totalDays) {
    if ($('poster-years')) $('poster-years').textContent = age.years;
    if ($('poster-zodiac-icon')) $('poster-zodiac-icon').textContent = zodiac.icon;
    if ($('poster-zodiac-name')) $('poster-zodiac-name').textContent = zodiac.name;
    if ($('poster-days-lived')) $('poster-days-lived').textContent = `${totalDays.toLocaleString()} Days Lived`;
}

// --- Confetti Effect ---
function triggerConfetti() {
    const container = $('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const particleCount = window.innerWidth <= 768 ? 25 : 60;

    for (let i = 0; i < particleCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(confetti);
    }
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// --- Main Calculation Dispatcher ---
function calculateAndShow() {
    const raw = dobInputEl?.value;
    const dob = raw ? new Date(raw) : null;

    if (!validateDob(dob)) {
        if (errorMessageEl) errorMessageEl.style.display = 'block';
        if (resultContainerEl) resultContainerEl.classList.add('hidden');
        return;
    }

    if (errorMessageEl) errorMessageEl.style.display = 'none';
    currentDob = dob;

    const now = new Date();
    const age = calculateAgeParts(dob, now);
    const totals = calculateTotals(dob, now);
    const nextB = computeNextBirthday(dob, now);
    const zodiac = getZodiacSign(dob.getMonth() + 1, dob.getDate());

    // Overview Tab Updates
    animateNumber($('years'), age.years);
    animateNumber($('months'), age.months);
    animateNumber($('days'), age.days);

    animateNumber($('hoursTotal'), totals.totalHours);
    animateNumber($('minutesTotal'), totals.totalMinutes);
    animateNumber($('secondsTotal'), totals.totalSeconds);

    if ($('next-birthday-date')) $('next-birthday-date').textContent = nextB.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    if ($('next-birthday-weekday')) $('next-birthday-weekday').textContent = nextB.date.toLocaleDateString(undefined, { weekday: 'long' });

    const countdown = {
        days: nextB.daysLeft,
        hours: 23 - now.getHours(),
        minutes: 59 - now.getMinutes(),
        seconds: 59 - now.getSeconds()
    };

    if ($('countdown-days')) $('countdown-days').textContent = countdown.days;
    if ($('countdown-hours')) $('countdown-hours').textContent = countdown.hours;
    if ($('countdown-minutes')) $('countdown-minutes').textContent = countdown.minutes;
    if ($('countdown-seconds')) $('countdown-seconds').textContent = countdown.seconds;

    // Progress Bar
    const lifeExpectancy = 75;
    const progressPct = Math.min(100, ((age.years / lifeExpectancy) * 100)).toFixed(1);
    if ($('life-progress')) $('life-progress').style.width = `${progressPct}%`;
    if ($('progress-text')) $('progress-text').textContent = `${progressPct}% of average life expectancy (75 yrs)`;

    // Additional Features
    updateDayOfBirthTrivia(dob);
    startLiveMillisecondTicker(dob);
    updatePlanetaryAge(totals.totalDays);
    updateVitals(totals);
    updateAstrology(dob);
    calculateHealthStatus();
    updateLoveLifeLine(age.years);
    updateMilestonesAndBadges(age.years, dob);
    updateStoryPoster(age, zodiac, totals.totalDays);

    // Show Results Panel
    if (resultContainerEl) {
        resultContainerEl.classList.remove('hidden');
        resultContainerEl.scrollIntoView({ behavior: 'smooth' });
    }

    triggerConfetti();
}

// --- Social Sharing Helpers ---
function copyTextToClipboard(text, message = 'Copied to clipboard!') {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => alert(message));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert(message);
    }
}

// --- DOM Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
            themeToggleBtn.innerHTML = isDark ?
                '<i class="fa-solid fa-sun"></i><span class="theme-text">Light Mode</span>' :
                '<i class="fa-solid fa-moon"></i><span class="theme-text">Dark Mode</span>';
        });
    }

    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            applyCustomThemeStyle(btn.dataset.theme);
        });
    });

    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateAndShow);
    }

    if (dobPickerBtnEl && dobInputEl) {
        dobPickerBtnEl.addEventListener('click', () => {
            try {
                if (typeof dobInputEl.showPicker === 'function') dobInputEl.showPicker();
                else dobInputEl.focus();
            } catch (_) {
                dobInputEl.focus();
            }
        });
    }


    $('generate-predictions-btn')?.addEventListener('click', () => {
        if (currentDob) updateAstrology(currentDob);
    });

    $('calculate-hw-btn')?.addEventListener('click', calculateHealthStatus);

    ['relationship-status', 'relationship-duration', 'total-relationships'].forEach(id => {
        $(id)?.addEventListener('change', () => {
            if (currentDob) updateLoveLifeLine(calculateAgeParts(currentDob, new Date()).years);
        });
    });

    // Share & Copy Event Listeners
    $('share-btn')?.addEventListener('click', () => {
        const text = `I am ${$('years').textContent} years, ${$('months').textContent} months old! 🚀 Check your cosmic age & astrology on Precision Age Calculator.`;
        if (navigator.share) {
            navigator.share({ title: 'My Precision Age', text });
        } else {
            copyTextToClipboard(text);
        }
    });

    $('copy-btn')?.addEventListener('click', () => {
        const text = `My Age: ${$('years').textContent} Years, ${$('months').textContent} Months, ${$('days').textContent} Days.\nTotal Lived: ${$('hoursTotal').textContent} Hours, ${$('minutesTotal').textContent} Minutes.\nNext Birthday: ${$('next-birthday-date').textContent}.`;
        copyTextToClipboard(text, 'Full Summary copied!');
    });

    $('copy-instagram-btn')?.addEventListener('click', () => {
        const text = `Exactly ${$('years').textContent} years, ${$('months').textContent} months, ${$('days').textContent} days old today! ✨ #AgeCalculator #PrecisionAge`;
        copyTextToClipboard(text, 'Instagram Caption copied!');
    });

    $('copy-twitter-btn')?.addEventListener('click', () => {
        const text = `Age: ${$('years').textContent} yrs | ${$('poster-days-lived')?.textContent} | Next Birthday in ${$('countdown-days').textContent} days 🚀`;
        copyTextToClipboard(text, 'Tweet copied!');
    });

    $('copy-whatsapp-btn')?.addEventListener('click', () => {
        const text = `🎂 My Age Journey: ${$('years').textContent} Years, ${$('months').textContent} Months, ${$('days').textContent} Days! #PrecisionAge`;
        copyTextToClipboard(text, 'WhatsApp Status text copied!');
    });
});
