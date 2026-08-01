document.addEventListener('DOMContentLoaded', async () => {
    // --- Dynamic Library Injection (Flatpickr for Visual Calendar) ---
    const loadFlatpickr = () => {
        if (document.getElementById('flatpickr-style')) return;
        
        const link = document.createElement('link');
        link.id = 'flatpickr-style';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
        document.head.appendChild(link);

        const darkLink = document.createElement('link');
        darkLink.rel = 'stylesheet';
        darkLink.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/themes/dark.css';
        document.head.appendChild(darkLink);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
        document.head.appendChild(script);

        const customStyle = document.createElement('style');
        customStyle.innerHTML = `
            /* Absolute Red for Booked Dates */
            .flatpickr-day.flatpickr-disabled, 
            .flatpickr-day.flatpickr-disabled:hover {
                background: #FF0000 !important; /* Pure Red */
                color: #FFFFFF !important;
                cursor: not-allowed !important;
                opacity: 1 !important;
                border-color: #FF0000 !important;
                pointer-events: none !important;
                text-decoration: none !important;
            }
            
            /* Enhanced visual X mark */
            .flatpickr-day.flatpickr-disabled::after {
                content: "✕";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 1.1rem;
                font-weight: 900;
                color: #FFFFFF;
                opacity: 0.8;
                pointer-events: none;
            }

            .flatpickr-calendar {
                background: #1a1a2e !important;
                border: 1px solid var(--primary-color) !important;
                box-shadow: 0 0 40px rgba(108, 99, 255, 0.4) !important;
            }
            .flatpickr-month, .flatpickr-weekday {
                background: #1a1a2e !important;
                color: #fff !important;
            }
            .flatpickr-day {
                color: #E0E0E0;
            }
            .flatpickr-day.today {
                border-color: var(--secondary-color) !important;
            }
            .flatpickr-day.selected {
                background: var(--primary-color) !important;
                border-color: var(--primary-color) !important;
            }
        `;
        document.head.appendChild(customStyle);
    };
    loadFlatpickr();

    // State
    let compareIds = JSON.parse(localStorage.getItem('compareIds')) || [];
    let currentUser = JSON.parse(localStorage.getItem('user')) || null;
    let currentUserId = currentUser ? currentUser.id : null;

    // UI Elements
    const carList = document.querySelector('#car-list');
    const recList = document.querySelector('#recommendation-list');
    const aiRecList = document.querySelector('#ai-recommendation-list');
    const rentalCarList = document.querySelector('#rental-car-list');
    const compareContainer = document.querySelector('.compare-container');
    const authButtons = document.querySelector('.auth-buttons');
    const detailsModal = document.getElementById('details-modal');
    const detailsContent = document.getElementById('details-content');

    // Modals Initialization (Moved Up for Robustness)
    const loginModal = document.getElementById('login-modal'), signupModal = document.getElementById('signup-modal');
    const loginForm = document.getElementById('login-form'), signupForm = document.getElementById('signup-form');
    const loginBtn = document.getElementById('login-btn'), signupBtn = document.getElementById('signup-btn');
    
    if (loginBtn) loginBtn.onclick = () => { if (loginModal) loginModal.style.display = 'flex'; };
    if (signupBtn && signupModal) signupBtn.onclick = () => { if (signupModal) signupModal.style.display = 'flex'; };
    
    const signupLink = document.getElementById('auth-signup-link');
    if (signupLink && loginModal && signupModal) signupLink.onclick = (e) => { e.preventDefault(); loginModal.style.display = 'none'; signupModal.style.display = 'flex'; };
    
    const loginLink = document.getElementById('auth-login-link');
    if (loginLink && loginModal && signupModal) loginLink.onclick = (e) => { e.preventDefault(); signupModal.style.display = 'none'; loginModal.style.display = 'flex'; };
    
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => { 
        if(loginModal) loginModal.style.display = 'none'; 
        if(signupModal) signupModal.style.display = 'none'; 
        if(detailsModal) detailsModal.style.display = 'none'; 
        document.body.style.overflow = ''; 
    });

    const updateAuthUI = () => {
        if (currentUser && authButtons) {
            // Add custom style for msg icon
            const style = document.createElement('style');
            style.innerHTML = `
                .nav-msg-icon { cursor: pointer !important; pointer-events: auto !important; position: relative; z-index: 9999; }
                .nav-msg-icon:hover { transform: scale(1.1); }
            `;
            document.head.appendChild(style);

            authButtons.innerHTML = `
                <div class="user-profile-nav" style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1000;">
                    <a href="inbox.html" class="nav-msg-icon" title="View Messages" 
                       style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.05); color: var(--text-main); font-size: 1.3rem; transition: var(--transition-smooth); text-decoration: none;">
                        <i class="fa-solid fa-envelope"></i>
                        <span id="msg-dot" style="display: none; position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; background: var(--accent-color); border-radius: 50%; border: 2px solid var(--bg-dark); pointer-events: none;"></span>
                    </a>
                    <span class="user-greeting" style="color: var(--text-main); font-weight: 500;">Hi, ${currentUser.name}</span>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            `;
            checkNewMessages();
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    localStorage.removeItem('user');
                    location.reload();
                });
            }
        }
    };

    async function checkNewMessages() {
        if (!currentUser) return;
        try {
            const encodedName = encodeURIComponent(currentUser.name);
            const res = await fetch(`${window.DriveAPI_BASE || 'http://127.0.0.1:5000/api'}/user-messages/${encodedName}`);
            const messages = await res.json();
            const hasNew = messages.some(m => m.status === 'Replied'); // Or track 'Unread' specifically
            const dot = document.getElementById('msg-dot');
            if (dot && hasNew) dot.style.display = 'block';
        } catch (err) {}
    }
    updateAuthUI();

    // --- GLOBAL FUNCTIONS ---

    window.viewDetails = async (id) => {
        if (!detailsModal || !detailsContent) return;
        try {
            const car = await window.DriveAPI.getCarDetails(id);
            if (!car || car.error) throw new Error("Car details not found");
            const insights = await window.DriveAPI.getMarketInsights(id, car.price);
            if (currentUserId) window.DriveAPI.logHistory(currentUserId, id).then(() => loadHistory());
            detailsContent.innerHTML = window.UIComponents.createDetailsModal(car, insights);
            detailsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error("Error loading car details:", err);
            alert("Failed to load car details.");
        }
    };

    window.addToCompare = async (id) => {
        if (!compareIds.includes(id)) {
            if (compareIds.length >= 3) {
                alert("You can compare up to 3 cars at a time.");
                compareIds.shift();
            }
            compareIds.push(id);
            localStorage.setItem('compareIds', JSON.stringify(compareIds));
            if (window.location.pathname.includes('comparison.html')) {
                loadComparison();
            } else {
                if (confirm("Car added to comparison. View comparison page now?")) {
                    window.location.href = 'comparison.html';
                }
            }
        } else {
            alert("This car is already in the comparison list.");
        }
    };

    window.addToWishlist = async (id) => {
        if (!currentUserId) {
            alert('Please login first');
            const lModal = document.getElementById('login-modal');
            if (lModal) lModal.style.display = 'flex';
            return;
        }
        const res = await window.DriveAPI.addToWishlist(currentUserId, id);
        alert(res.message);
        loadWishlist();
    };

    window.removeFromWishlist = async (id) => {
        if (!currentUserId) return;
        await window.DriveAPI.removeFromWishlist(currentUserId, id);
        loadWishlist();
    };

    window.handlePaymentChange = (method) => {
        const container = document.getElementById('dynamic-payment-fields');
        if (!container) return;
        container.innerHTML = '';
        if (method === 'card') {
            container.innerHTML = `<div class="form-group-dynamic"><label>Card Number</label><input type="text" placeholder="XXXX XXXX XXXX XXXX" required></div><div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top:10px;"><div class="form-group"><label>Expiry</label><input type="text" placeholder="12/28" required></div><div class="form-group"><label>CVV</label><input type="password" placeholder="***" maxlength="3" required></div></div>`;
        } else if (method === 'upi') {
            container.innerHTML = `<div class="form-group-dynamic"><label>UPI ID</label><input type="text" placeholder="username@bank" required></div>`;
        } else if (method === 'netbanking') {
            container.innerHTML = `<div class="form-group-dynamic"><label>Select Bank</label><select required><option value="HDFC">HDFC Bank</option><option value="SBI">SBI</option></select></div>`;
        }
    };

    window.openRentalModal = async (id) => {
        console.log("Opening Rental Modal for Car ID:", id);
        if (!detailsModal || !detailsContent) return;
        try {
            const car = await window.DriveAPI.getCarDetails(id);
            if (!car || car.error) throw new Error("Car details not found");
            console.log("Car Details Loaded:", car);
            
            detailsContent.innerHTML = window.UIComponents.createRentalModal(car);
            detailsModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // --- Fetch and Display Booked Dates ---
            const bookedDatesList = document.getElementById('booked-dates-list');
            let carBookedDates = [];
            try {
                const apiUrl = `${window.DriveAPI_BASE || 'http://127.0.0.1:5000/api'}/car-booked-dates/${id}`;
                console.log("Fetching booked dates from:", apiUrl);
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                
                carBookedDates = await res.json();
                console.log("Booked Dates Received:", carBookedDates);

                if (bookedDatesList) {
                    if (carBookedDates.length > 0) {
                        bookedDatesList.innerHTML = carBookedDates.map(b => `
                            <div class="booked-date-item">
                                <i class="fa-solid fa-calendar-xmark"></i>
                                <span>${new Date(b.pickup_date).toLocaleDateString()} to ${new Date(b.return_date).toLocaleDateString()}</span>
                            </div>
                        `).join('');
                    } else {
                        bookedDatesList.innerHTML = '<span class="no-dates">No upcoming bookings. All dates available!</span>';
                    }
                }
            } catch (err) {
                console.error("Failed to fetch booked dates:", err);
                if (bookedDatesList) bookedDatesList.innerHTML = `<span class="error-dates">Availability check failed: ${err.message}</span>`;
            }
            window.currentCarBookedDates = carBookedDates; // Store for validation

            // --- Date Validation: Prevent Past Dates ---
            const today = new Date().toISOString().split('T')[0];
            const pickupInput = document.getElementById('rental-pickup-date');
            const returnInput = document.getElementById('rental-return-date');
            if (pickupInput) pickupInput.min = today;
            if (returnInput) returnInput.min = today;

            // --- Advanced Document Upload Validation & UI ---
            const handleFileUpload = (file, inputId) => {
                const input = document.getElementById(inputId);
                const box = input.closest('.upload-box');
                const errorEl = box.querySelector('.error-msg');
                const previewEl = box.querySelector('.upload-preview');
                const infoText = box.querySelector('small');
                
                // Reset State
                box.classList.remove('uploaded', 'error');
                errorEl.innerText = '';
                previewEl.style.display = 'none';

                if (!file) return;

                // 1. Format Validation (JPG, PNG, PDF)
                const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                if (!allowedTypes.includes(file.type)) {
                    box.classList.add('error');
                    errorEl.innerText = "Only JPG, PNG, and PDF files are allowed";
                    input.value = '';
                    return;
                }

                // 2. Size Validation (Max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    box.classList.add('error');
                    errorEl.innerText = "File size must be less than 5MB";
                    input.value = '';
                    return;
                }

                // 3. Success State
                box.classList.add('uploaded');
                infoText.innerText = "✓ Uploaded: " + (file.name.length > 20 ? file.name.substring(0, 17) + "..." : file.name);

                // 4. Image Preview
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewEl.src = e.target.result;
                        previewEl.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            };

            const setupUploadEvents = (inputId) => {
                const input = document.getElementById(inputId);
                const box = input.closest('.upload-box');

                // File Input Change
                input.onchange = (e) => handleFileUpload(e.target.files[0], inputId);

                // Drag & Drop
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    box.addEventListener(eventName, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }, false);
                });

                box.addEventListener('dragover', () => box.classList.add('drag-over'));
                box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
                box.addEventListener('drop', (e) => {
                    box.classList.remove('drag-over');
                    const file = e.dataTransfer.files[0];
                    if (file) {
                        // Create a new FileList-like object or just manually set the logic
                        // Browser security prevents setting input.files directly easily,
                        // so we handle the validation and we'll check this state on submit.
                        handleFileUpload(file, inputId);
                        // Store the dropped file in a property for the form submit to find
                        input.droppedFile = file; 
                    }
                });
            };

            setupUploadEvents('license-upload');
            setupUploadEvents('id-upload');

            // --- Initialize Flatpickr (Modern Calendar) ---
            const initFlatpickr = () => {
                if (typeof flatpickr === 'undefined') {
                    setTimeout(initFlatpickr, 100);
                    return;
                }

                const disabledDates = carBookedDates.map(b => ({
                    from: b.pickup_date,
                    to: b.return_date
                }));

                const fpConfig = {
                    minDate: "today",
                    dateFormat: "Y-m-d",
                    disable: disabledDates,
                    onDayCreate: (dObj, dStr, fp, dayElem) => {
                        // Highlight disabled dates in red
                        const date = dayElem.dateObj;
                        const isBooked = disabledDates.some(range => {
                            const start = new Date(range.from);
                            const end = new Date(range.to);
                            start.setHours(0,0,0,0);
                            end.setHours(0,0,0,0);
                            return date >= start && date <= end;
                        });
                        if (isBooked) {
                            dayElem.classList.add("booked-date");
                            dayElem.title = "Already Booked";
                        }
                    },
                    onChange: () => window.updateRentalSummary()
                };

                flatpickr("#rental-pickup-date", fpConfig);
                flatpickr("#rental-return-date", fpConfig);
            };
            initFlatpickr();

            // Store current car price globally for summary calculations
            window.currentRentalCarPrice = car.price_per_day || car.price || 0;

            const form = document.getElementById('rental-form');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    
                    // 1. Validate Name
                    const userName = document.getElementById('rental-user-name').value.trim();
                    if (!userName) {
                        alert("Please enter your full name.");
                        document.getElementById('rental-user-name').focus();
                        return;
                    }

                    // 2. Validate Location
                    const location = document.getElementById('rental-location').value.trim();
                    if (!location) {
                        alert("Please enter a pickup location.");
                        document.getElementById('rental-location').focus();
                        return;
                    }

                    // 3. Validate Dates
                    const pickupDateStr = document.getElementById('rental-pickup-date').value;
                    const returnDateStr = document.getElementById('rental-return-date').value;
                    if (!pickupDateStr || !returnDateStr) {
                        alert("Please select both Pickup and Return dates.");
                        return;
                    }

                    // 4. Validate Driver Option
                    const driverOption = document.querySelector('input[name="driver-option"]:checked')?.value;
                    if (!driverOption) {
                        alert("Please select a driver option (Self Drive or With Driver).");
                        return;
                    }

                    // 5. Guard: Required Documents (Strictly Mandatory)
                    const licenseInput = document.getElementById('license-upload');
                    const idInput = document.getElementById('id-upload');
                    
                    const hasLicense = (licenseInput.files && licenseInput.files[0]) || licenseInput.droppedFile;
                    const hasId = (idInput.files && idInput.files[0]) || idInput.droppedFile;

                    if (!hasLicense) {
                        alert("Mandatory: Please upload your Driving License.");
                        licenseInput.closest('.upload-box').classList.add('error');
                        return;
                    }
                    if (!hasId) {
                        alert("Mandatory: Please upload your ID Proof (Aadhar/Passport).");
                        idInput.closest('.upload-box').classList.add('error');
                        return;
                    }

                    // Check for active file errors (format/size)
                    if (document.querySelector('.upload-box.error')) {
                        alert("Please fix the file errors (format/size) before confirming.");
                        return;
                    }

                    // 6. Future Time Check
                    const pickupTimeStr = document.getElementById('rental-pickup-time').value;
                    const pickupFull = new Date(`${pickupDateStr}T${pickupTimeStr}`);
                    if (pickupFull < new Date()) {
                        alert("Pickup time cannot be in the past.");
                        return;
                    }

                    // 7. Payment: send booking as a request for admin approval
                    const formData = new FormData();
                    formData.append('car_id', document.getElementById('rental-car-id').value);
                    formData.append('user_name', document.getElementById('rental-user-name').value);
                    formData.append('pickup_date', pickupDateStr);
                    formData.append('pickup_time', pickupTimeStr);
                    formData.append('return_date', document.getElementById('rental-return-date').value);
                    formData.append('return_time', document.getElementById('rental-return-time').value);
                    formData.append('location', document.getElementById('rental-location').value);
                    formData.append('driver_option', document.querySelector('input[name="driver-option"]:checked')?.value || 'Self Drive');
                    
                    const driverId = document.getElementById('selected-driver-id')?.value;
                    if (driverId) formData.append('driver_id', driverId);

                    // Default payment method: will be performed after admin approval
                    formData.append('payment_method', 'Pay at Pickup');

                    // Append Files
                    const licenseFile = licenseInput.files[0] || licenseInput.droppedFile;
                    const idFile = idInput.files[0] || idInput.droppedFile;
                    if (licenseFile) formData.append('license', licenseFile);
                    if (idFile) formData.append('id_proof', idFile);

                    if (new Date(document.getElementById('rental-return-date').value) <= new Date(pickupDateStr)) 
                        return alert("Return date must be after pickup date");
                    
                    try {
                        // Use raw fetch for multipart/form-data
                        const res = await fetch(`${window.DriveAPI_BASE || 'http://127.0.0.1:5000/api'}/rent`, {
                            method: 'POST',
                            body: formData
                        });
                        const result = await res.json();
                        if (res.ok) {
                                showSuccessPopup();
                            } else {
                                alert("Error: " + result.error);
                            }
                    } catch (err) { alert("Server error"); }
                };
            }
        } catch (err) {
            console.error("Error opening rental modal:", err);
            alert("Failed to load car for rental.");
        }
    };

    window.updateRentalSummary = () => {
        const pickupDateVal = document.getElementById('rental-pickup-date').value;
        const returnDateVal = document.getElementById('rental-return-date').value;
        const driverOption = document.querySelector('input[name="driver-option"]:checked')?.value;
        
        // Driver selection container visibility
        const driverContainer = document.getElementById('driver-selection-container');
        if (driverContainer) {
            if (driverOption === 'driver') {
                driverContainer.style.display = 'block';
                loadDriversForRental();
            } else {
                driverContainer.style.display = 'none';
            }
        }

        if (pickupDateVal && returnDateVal) {
            const pickupDate = new Date(pickupDateVal);
            const returnDate = new Date(returnDateVal);
            const now = new Date();
            now.setHours(0,0,0,0);

            if (pickupDate < now) {
                alert("Pickup date cannot be in the past.");
                document.getElementById('rental-pickup-date').value = '';
                return;
            }

            // --- Overlap Validation ---
            if (window.currentCarBookedDates && window.currentCarBookedDates.length > 0) {
                const isOverlapping = window.currentCarBookedDates.some(b => {
                    const bookedStart = new Date(b.pickup_date);
                    const bookedEnd = new Date(b.return_date);
                    // Standard overlap check: (StartA <= EndB) and (EndA >= StartB)
                    return (pickupDate <= bookedEnd) && (returnDate >= bookedStart);
                });

                if (isOverlapping) {
                    alert("Selected dates overlap with an existing booking. Please choose different dates.");
                    document.getElementById('rental-pickup-date').value = '';
                    document.getElementById('rental-return-date').value = '';
                    return;
                }
            }

            if (returnDate > pickupDate) {
                const diffTime = Math.abs(returnDate - pickupDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                
                let pricePerDay = window.currentRentalCarPrice || 0;
                if (driverOption === 'driver') pricePerDay += 1000; // Add 1000 for driver

                const baseAmount = diffDays * pricePerDay;
                const taxes = baseAmount * 0.18;
                const deposit = 2000;
                const total = baseAmount + taxes + deposit;

                document.getElementById('summary-days').innerText = diffDays;
                document.getElementById('summary-base').innerText = `₹${baseAmount.toLocaleString()}`;
                document.getElementById('summary-taxes').innerText = `₹${taxes.toLocaleString()}`;
                document.getElementById('summary-total').innerText = `₹${total.toLocaleString()}`;
            }
        }
    };

    async function loadDriversForRental() {
        const grid = document.getElementById('driver-list-grid');
        if (!grid || grid.children.length > 0) return; // Already loaded or no grid

        try {
            const apiUrl = `${window.DriveAPI_BASE || 'http://127.0.0.1:5000/api'}/drivers`;
            const res = await fetch(apiUrl);
            const drivers = await res.json();
            window.availableDriversForRental = drivers.filter(d => d.status === 'Available');

            if (window.availableDriversForRental.length === 0) {
                grid.innerHTML = '<p class="no-dates">No available drivers at the moment.</p>';
                return;
            }

            grid.innerHTML = window.availableDriversForRental.map(d => `
                <div class="driver-option-card" onclick="selectDriverForRental(${d.id}, this)">
                    <img src="${d.image_url || 'https://via.placeholder.com/50'}" alt="${d.name}">
                    <span class="driver-name">${d.name}</span>
                    <span class="driver-exp">${d.experience || 0} Yrs Exp</span>
                </div>
            `).join('');
        } catch (err) {
            console.error("Error loading drivers:", err);
            grid.innerHTML = '<p class="no-dates">Error loading drivers.</p>';
        }
    }

    window.selectDriverForRental = (id, element) => {
        document.querySelectorAll('.driver-option-card').forEach(card => card.classList.remove('selected'));
        element.classList.add('selected');
        document.getElementById('selected-driver-id').value = id;

        const detailsContainer = document.getElementById('selected-driver-details');
        if (detailsContainer && window.availableDriversForRental) {
            const driver = window.availableDriversForRental.find(d => d.id === id);
            if (driver) {
                const rating = driver.rating || 5;
                let starsHTML = '';
                for(let i=1; i<=5; i++) {
                    starsHTML += `<i class="fa-solid fa-star" style="color: ${i <= rating ? '#FFD700' : 'var(--surface-border)'}; font-size: 0.8rem;"></i>`;
                }

                detailsContainer.innerHTML = `
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <img src="${driver.image_url || 'https://via.placeholder.com/60'}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary-color);">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h4 style="margin: 0; color: var(--primary-color);">${driver.name}</h4>
                                <div style="display: flex; gap: 2px;">${starsHTML}</div>
                            </div>
                            <p style="margin: 3px 0 0 0; font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-id-card"></i> License: ${driver.license_no || 'N/A'}</p>
                            <p style="margin: 3px 0 0 0; font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-phone"></i> Contact: ${driver.phone || 'N/A'}</p>
                            <p style="margin: 3px 0 0 0; font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-briefcase"></i> Experience: ${driver.experience || 0} Years</p>
                            ${driver.languages ? `<p style="margin: 3px 0 0 0; font-size: 0.85rem; color: var(--text-muted);"><i class="fa-solid fa-language"></i> Speaks: ${driver.languages}</p>` : ''}
                        </div>
                    </div>
                `;
                detailsContainer.style.display = 'block';
            }
        }
    };

    window.applyCoupon = () => {
        const el = document.getElementById('coupon-code');
        if (!el) return alert('No coupon field available');
        const code = el.value;
        if (code.toUpperCase() === 'DRIVE10') {
            alert("Coupon Applied! 10% discount added.");
        } else {
            alert("Invalid Coupon Code");
        }
    };

    function showSuccessPopup() {
        detailsContent.innerHTML = `
            <div class="success-popup">
                <div class="success-icon">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h2>Booking Request Sent!</h2>
                <p>Your booking request has been sent to admin for approval. You will be able to complete payment once it's approved.</p>
                <div class="success-actions">
                    <button class="btn btn-primary" onclick="location.href='my-bookings.html'">View My Bookings</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('details-modal').style.display='none'; document.body.style.overflow='';">Close</button>
                </div>
            </div>
        `;
    }

    window.openQueryModal = (id, name) => {
        if (!detailsModal || !detailsContent) return;
        detailsContent.innerHTML = window.UIComponents.createQueryModal(id, name);
        detailsModal.style.display = 'flex';
        const form = document.getElementById('query-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const qData = {
                    car_id: document.getElementById('query-car-id').value,
                    user_name: document.getElementById('query-user-name').value,
                    subject: document.getElementById('query-subject').value,
                    message: document.getElementById('query-message').value
                };
                try {
                    const res = await fetch(`${window.DriveAPI_BASE || 'http://127.0.0.1:5000/api'}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(qData)
                    });
                    const data = await res.json();
                    if (res.ok) {
                        alert(data.message);
                        detailsModal.style.display = 'none';
                        document.body.style.overflow = '';
                    } else { alert("Error: " + data.error); }
                } catch (err) { alert("Server error while sending message"); }
            };
        }
    };

    // --- DATA LOADING ---

    async function loadCars(filters = {}) {
        const container = document.querySelector('#car-list');
        if (!container) return;
        try {
            const cars = await window.DriveAPI.getCars(filters);
            container.innerHTML = (cars && cars.length) ? cars.map(car => window.UIComponents.createCarCard(car)).join('') : '<p>No cars found.</p>';
        } catch (err) { console.error("Load cars fail", err); }
    }

    async function loadRentalCars() {
        const container = document.querySelector('#rental-car-list');
        if (!container) return;
        try {
            const cars = await window.DriveAPI.getCars();
            const rentalCars = cars.slice(0, 10);
            container.innerHTML = rentalCars.map(car => window.UIComponents.createRentalCarCard(car)).join('');
        } catch (err) { console.error("Load rental cars fail", err); }
    }

    async function loadRecs(prefs = {}) {
        const container = document.querySelector('#recommendation-list');
        if (!container) return;
        try {
            const data = await window.DriveAPI.getRecommendations(prefs);
            container.innerHTML = data.map(car => window.UIComponents.createRentalCarCard(car)).join('');
        } catch (err) { console.error("Load recs fail", err); }
    }

    async function loadComparison() {
        const container = document.querySelector('.compare-container');
        if (!container) return;
        if (compareIds.length === 0) {
            container.innerHTML = `<div class="compare-placeholder"><i class="fa-solid fa-layer-group"></i><p>Select up to 3 cars to compare.</p><a href="explore.html" class="btn btn-primary" style="margin-top:20px; text-decoration:none; display:inline-block;">Browse Cars</a></div>`;
            return;
        }
        try {
            const cars = await window.DriveAPI.compareCars(compareIds);
            if (!cars || cars.length === 0) { compareIds = []; localStorage.removeItem('compareIds'); loadComparison(); return; }
            let html = window.UIComponents.createComparisonTable(cars);
            html += `<div style="text-align:center; margin-top:40px;"><button class="btn btn-secondary" onclick="clearComparison()">Clear Comparison</button></div>`;
            container.innerHTML = html;
        } catch (err) { container.innerHTML = `<p style="color:red; text-align:center;">Failed to load comparison.</p>`; }
    }

    window.clearComparison = () => {
        if (confirm("Clear all?")) { compareIds = []; localStorage.removeItem('compareIds'); loadComparison(); }
    };

    async function loadWishlist() {
        const el = document.getElementById('wishlist-items');
        if (!el || !currentUserId) return;
        try {
            const items = await window.DriveAPI.getWishlist(currentUserId);
            el.innerHTML = (items && items.length) ? items.map(item => createDashItem(item, true)).join('') : '<p class="empty-msg">Empty wishlist.</p>';
        } catch (err) { console.error("Load wishlist fail", err); }
    }

    async function loadHistory() {
        const el = document.getElementById('history-items');
        if (!el || !currentUserId) return;
        try {
            const items = await window.DriveAPI.getHistory(currentUserId);
            el.innerHTML = (items && items.length) ? items.map(item => createDashItem(item)).join('') : '<p class="empty-msg">No history.</p>';
        } catch (err) { console.error("Load history fail", err); }
    }

    function createDashItem(item, isWishlist = false) {
        return `<div class="dash-item glass"><img src="${item.image_url_front || 'https://via.placeholder.com/40'}" width="40" style="border-radius: 4px; cursor: pointer;" onclick="viewDetails(${item.id})"><div style="flex: 1;"><strong style="font-size: 0.8rem;">${item.brand} ${item.model}</strong><p style="font-size: 0.7rem; color: var(--secondary-color);">₹${item.price.toLocaleString()}</p></div><div class="dash-item-actions"><button onclick="addToCompare(${item.id})"><i class="fa-solid fa-plus"></i></button>${isWishlist ? `<button onclick="removeFromWishlist(${item.id})" style="color: var(--accent-color);"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div>`;
    }

    // INITIALIZATION ---
    loadCars();
    loadRentalCars();
    loadRecs({ budget: 10000000, fuel_type: 'Petrol', body_type: 'SUV' });
    loadComparison();
    loadWishlist();
    loadHistory();

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            try {
                const res = await window.DriveAPI.login(email, password);
                if (res.user) { 
                    localStorage.setItem('user', JSON.stringify(res.user)); 
                    // Redirection based on role
                    if (res.user.role === 'admin') {
                        alert("Welcome back, Admin!");
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        alert(`Welcome, ${res.user.name}!`);
                        location.reload(); 
                    }
                } else {
                    alert(res.error || "Login failed. Please check your credentials.");
                }
            } catch (err) {
                console.error("Login Error:", err);
                alert(`Connection Failed!\n\nTechnical Error: ${err.message}\n\n1. Ensure Flask is running (python app.py).\n2. Check if terminal shows any errors.`);
            }
        };
    }


    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = signupForm.querySelector('input[type="text"]').value;
            const email = signupForm.querySelector('input[type="email"]').value;
            const password = signupForm.querySelector('input[type="password"]').value;
            try {
                const res = await window.DriveAPI.register(name, email, password);
                if (res.message) { 
                    alert("Account created successfully! Please login."); 
                    signupModal.style.display = 'none'; 
                    loginModal.style.display = 'flex'; 
                }
                else { alert(res.error || "Registration failed"); }
            } catch (err) { alert("Server connection failed"); }
        };
    }

    // Explore Filters Guard
    const searchBtn = document.querySelector('.sidebar .btn-primary');
    if (searchBtn && carList) {
        searchBtn.onclick = async () => {
            const filters = {
                brand: document.getElementById('brand-filter')?.value || '',
                max_price: document.getElementById('budget-range')?.value || '',
                usage: document.getElementById('usage-filter')?.value || '',
                priority: document.getElementById('priority-filter')?.value || '',
                fuel_type: document.querySelector('.checkbox-group input:checked')?.value || ''
            };
            loadCars(filters);
        };
    }

    // Recommendation Form Guard
    const aiForm = document.getElementById('ai-recom-form');
    if (aiForm && aiRecList) {
        aiForm.onsubmit = async (e) => {
            e.preventDefault();
            const loader = document.getElementById('recom-loader');
            const resCont = document.getElementById('recom-results-container');
            const emptyState = document.getElementById('recom-empty');
            loader.style.display = 'block'; resCont.style.display = 'none'; emptyState.style.display = 'none';
            const prefs = { budget: document.getElementById('recom-budget').value, fuel_type: document.getElementById('recom-fuel').value, body_type: document.getElementById('recom-body').value, location: document.getElementById('recom-location').value };
            try {
                const cars = await window.DriveAPI.getRecommendations(prefs);
                loader.style.display = 'none';
                if (cars && cars.length > 0) { resCont.style.display = 'block'; aiRecList.innerHTML = cars.map(car => window.UIComponents.createRentalCarCard(car)).join(''); }
                else { emptyState.style.display = 'block'; }
            } catch (err) { loader.style.display = 'none'; alert("AI Offline"); }
        };
    }
});
