document.addEventListener('DOMContentLoaded', () => {
    const calendarDaysGrid = document.getElementById('calendar-days');
    const currentMonthYear = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const bookingModal = document.getElementById('booking-modal');
    const loginModal = document.getElementById('login-modal');
    const closeBookingBtn = document.getElementById('close-booking-modal');
    const closeLoginBtn = document.getElementById('close-login-modal');
    const bookingForm = document.getElementById('booking-form');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userStatus = document.getElementById('user-status');
    const roomSelect = document.getElementById('room-select');
    const roomSlotsContainer = document.getElementById('room-slots-container');
    const bookingsTableBody = document.querySelector('#bookings-table tbody');
    const bookingsTableHead = document.querySelector('#bookings-table thead');

    let currentDate = new Date();
    let loggedInUser = null;
    let selectedDate = null;
    let selectedTimeSlot = null;

    const timeSlots = [
        '9:00 AM – 10:00 AM', '10:15 AM – 11:15 AM', '11:30 AM – 12:30 PM',
        '1:30 PM – 2:30 PM', '2:45 PM – 3:45 PM', '4:00 PM – 5:00 PM',
        '5:15 PM – 6:15 PM', '6:30 PM – 7:30 PM', '7:45 PM – 8:45 PM'
    ];

    // Auth
    const loadAuthState = () => {
        const stored = localStorage.getItem('workspaceUser');
        if (stored) loggedInUser = JSON.parse(stored);
    };
    const saveAuthState = () => {
        if (loggedInUser) localStorage.setItem('workspaceUser', JSON.stringify(loggedInUser));
        else localStorage.removeItem('workspaceUser');
    };
    const updateAuthUI = () => {
        if (loggedInUser) {
            userStatus.textContent = `${loggedInUser.role === 'Admin' ? '🛡️' : '👤'} ${loggedInUser.username} (${loggedInUser.role})`;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
        } else {
            userStatus.textContent = 'Not logged in';
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
        }
    };

    // Login — no password required
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const role = document.getElementById('role-select').value;
        if (!username) { showToast('Please enter your name.', 'error'); return; }
        if (!role) { showToast('Please select a role.', 'error'); return; }
        loggedInUser = { username, role };
        saveAuthState();
        updateAuthUI();
        loginModal.style.display = 'none';
        loginForm.reset();
        renderBookingsTable();
        showToast(`Welcome, ${username}! Logged in as ${role}.`);
    });

    logoutBtn.addEventListener('click', () => {
        loggedInUser = null;
        saveAuthState();
        updateAuthUI();
        renderBookingsTable();
        showToast('Logged out successfully.', 'info');
    });

    loginBtn.addEventListener('click', () => { loginModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; });
    closeLoginBtn.addEventListener('click', () => { loginModal.style.display = 'none'; document.body.style.overflow = ''; });
    loginModal.addEventListener('click', (e) => { if (e.target === loginModal) { loginModal.style.display = 'none'; document.body.style.overflow = ''; } });
    if (bookingModal) bookingModal.addEventListener('click', (e) => { if (e.target === bookingModal) { bookingModal.style.display = 'none'; document.body.style.overflow = ''; } });

    // Storage
    const getBookings = () => JSON.parse(localStorage.getItem('workspaceBookings') || '[]');
    const saveBookings = (b) => localStorage.setItem('workspaceBookings', JSON.stringify(b));

    // Toast
    const showToast = (msg, type = 'success') => {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3200);
    };

    // Calendar
    const renderCalendar = () => {
        if (!calendarDaysGrid) return;
        calendarDaysGrid.innerHTML = '';
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const startIndex = firstDay.getDay();
        currentMonthYear.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const bookings = getBookings();
        const today = new Date(); today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 42; i++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            const dayNumber = i - startIndex + 1;
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);

            if (i >= startIndex && dayNumber <= lastDay) {
                dayCell.classList.add('current-month');
                const isPast = cellDate < today;
                if (isPast) dayCell.classList.add('past-day');
                if (cellDate.toDateString() === today.toDateString()) dayCell.classList.add('today');

                const daySpan = document.createElement('span');
                daySpan.classList.add('day-number');
                daySpan.textContent = dayNumber;
                dayCell.appendChild(daySpan);

                const cellDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`;
                const dayBookings = bookings.filter(b => b.date === cellDateStr);

                if (dayBookings.length > 0) {
                    const badge = document.createElement('div');
                    badge.className = 'booking-badge';
                    badge.textContent = `${dayBookings.length} booked`;
                    dayCell.appendChild(badge);
                }

                if (!isPast) {
                    dayCell.style.cursor = 'pointer';
                    dayCell.addEventListener('click', () => {
                        if (loggedInUser) openBookingModal(cellDateStr, cellDate);
                        else { loginModal.style.display = 'flex'; showToast('Please log in to book a room.', 'info'); }
                    });
                }
            } else {
                dayCell.classList.add('empty-cell');
            }
            calendarDaysGrid.appendChild(dayCell);
        }
    };

    const openBookingModal = (dateStr, dateObj) => {
        selectedDate = dateStr;
        document.getElementById('selected-date').value = dateStr;
        document.getElementById('display-date').textContent = dateObj.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        roomSelect.value = '';
        roomSlotsContainer.innerHTML = '';
        selectedTimeSlot = null;
        bookingModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    closeBookingBtn.addEventListener('click', () => {
        bookingModal.style.display = 'none';
        bookingForm.reset();
        selectedTimeSlot = null;
        document.body.style.overflow = '';
    });

    roomSelect.addEventListener('change', () => {
        const selectedRoom = roomSelect.value;
        roomSlotsContainer.innerHTML = '';
        selectedTimeSlot = null;
        if (!selectedRoom) return;

        const bookings = getBookings();
        const bookedSlots = bookings.filter(b => b.date === selectedDate && b.room === selectedRoom).map(b => b.timeSlot);

        const label = document.createElement('p');
        label.className = 'slots-label';
        label.textContent = 'Select an available time slot:';
        roomSlotsContainer.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'slots-grid';

        timeSlots.forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'room-slot-item';
            slotDiv.textContent = slot;
            if (bookedSlots.includes(slot)) {
                slotDiv.classList.add('booked-slot');
                slotDiv.title = 'Already booked';
            } else {
                slotDiv.addEventListener('click', () => {
                    document.querySelectorAll('.room-slot-item').forEach(el => el.classList.remove('selected-slot'));
                    slotDiv.classList.add('selected-slot');
                    selectedTimeSlot = slot;
                });
            }
            grid.appendChild(slotDiv);
        });
        roomSlotsContainer.appendChild(grid);
    });

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!selectedTimeSlot) { showToast('Please select a time slot.', 'error'); return; }
        const bookings = getBookings();
        bookings.push({
            id: Date.now(),
            date: selectedDate,
            timeSlot: selectedTimeSlot,
            room: roomSelect.value,
            title: document.getElementById('meeting-title').value,
            description: document.getElementById('meeting-description').value,
            user: loggedInUser.username,
            role: loggedInUser.role
        });
        saveBookings(bookings);
        bookingModal.style.display = 'none';
        bookingForm.reset();
        selectedTimeSlot = null;
        document.body.style.overflow = '';
        renderCalendar();
        renderBookingsTable();
        showToast('✅ Booking confirmed!');
    });

    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); });
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); });

    // Admin Table
    const renderBookingsTable = () => {
        if (!bookingsTableBody) return;
        bookingsTableBody.innerHTML = '';
        if (loggedInUser?.role !== 'Admin') {
            if (bookingsTableHead) bookingsTableHead.innerHTML = '';
            return;
        }
        if (bookingsTableHead) {
            bookingsTableHead.innerHTML = `<tr><th>Date</th><th>Time Slot</th><th>Room</th><th>Title</th><th>Booked By</th><th>Role</th><th>Action</th></tr>`;
        }
        const bookings = getBookings();
        if (!bookings.length) {
            bookingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">No bookings yet.</td></tr>';
            return;
        }
        bookings.sort((a,b) => new Date(a.date)-new Date(b.date)).forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(b.date+'T00:00:00').toLocaleDateString('en-IN')}</td>
                <td>${b.timeSlot}</td>
                <td>${b.room}</td>
                <td>${b.title}</td>
                <td>${b.user}</td>
                <td><span class="role-badge ${b.role==='Admin'?'badge-admin':'badge-staff'}">${b.role}</span></td>
                <td><button class="delete-btn" data-id="${b.id}">🗑️ Delete</button></td>`;
            bookingsTableBody.appendChild(tr);
        });
    };

    if (bookingsTableBody) {
        bookingsTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-btn');
            if (btn) {
                const id = Number(btn.dataset.id);
                saveBookings(getBookings().filter(b => b.id !== id));
                renderBookingsTable();
                renderCalendar();
                showToast('Booking deleted.', 'info');
            }
        });
    }

    loadAuthState();
    updateAuthUI();
    renderCalendar();
    renderBookingsTable();
});
