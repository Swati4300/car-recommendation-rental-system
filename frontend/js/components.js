const components = {
    createCarCard(car, isUpgrade = false) {
        const image = car.image || car.image_url_front || 'https://via.placeholder.com/300x180';
        return `
            <div class="car-card ${isUpgrade ? 'upgrade-card' : ''}">
                <div class="car-img">
                    <img src="${image}" alt="${car.brand} ${car.model}">
                    <button class="wishlist-btn" onclick="addToWishlist(${car.id})">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
                <div class="car-info">
                    <div class="car-category">${car.category || car.body_type}</div>
                    <h4>${car.brand} ${car.model}</h4>
                    <div class="car-price">₹${(car.price || 0).toLocaleString()}</div>
                    <div class="car-specs">
                        <span><i class="fa-solid fa-gauge-high"></i> ${car.mileage || 'N/A'}</span>
                        <span><i class="fa-solid fa-bolt"></i> ${car.fuel_type || 'N/A'}</span>
                    </div>
                    <div class="car-actions">
                        <button class="btn btn-primary" onclick="viewDetails(${car.id})">Details</button>
                        <button class="btn btn-secondary" onclick="addToCompare(${car.id})"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
    },

    createDetailsModal(car, insights) {
        const pros = car.pros ? car.pros.split(',').map(p => `<li><i class="fa-solid fa-circle-check"></i> ${p.trim()}</li>`).join('') : '';
        const cons = car.cons ? car.cons.split(',').map(c => `<li><i class="fa-solid fa-circle-xmark"></i> ${c.trim()}</li>`).join('') : '';
        const features = car.features ? car.features.split(',').map(f => `<span class="feature-tag"><i class="fa-solid fa-check"></i> ${f.trim()}</span>`).join('') : '';
        const suitability = (score) => {
            let stars = '';
            for(let i=0; i<5; i++) stars += `<i class="fa-solid fa-star ${i < score ? 'active' : ''}"></i>`;
            return stars;
        };

        const availFrom = car.available_from ? new Date(car.available_from).toLocaleDateString() : 'N/A';
        const availUntil = car.available_until ? new Date(car.available_until).toLocaleDateString() : 'N/A';
        const availability = car.available_from && car.available_until ? `${availFrom} to ${availUntil}` : 'All year';

        return `
            <div class="details-layout">
                <div class="details-gallery">
                    <div class="main-img-container">
                        <img src="${car.image_url_front}" id="modal-main-img" class="main-img">
                    </div>
                    <div class="thumb-grid">
                        <img src="${car.image_url_front}" onclick="document.getElementById('modal-main-img').src=this.src" class="thumb">
                    </div>
                    <div class="specs-grid">
                        <div class="spec-box"><i class="fa-solid fa-chair"></i> <span>${car.seats || 5}</span><label>Seats</label></div>
                        <div class="spec-box"><i class="fa-solid fa-location-dot"></i> <span>${car.location || 'N/A'}</span><label>Location</label></div>
                        <div class="spec-box"><i class="fa-solid fa-calendar-check"></i> <span>${availability}</span><label>Available</label></div>
                        <div class="spec-box"><i class="fa-solid fa-shield"></i> <span>${car.safety_rating || 0}/5</span><label>Safety</label></div>
                    </div>
                </div>
                <div class="details-info">
                    <div class="info-header"><h2>${car.brand} ${car.model}</h2><span class="price-tag">₹${(car.price || 0).toLocaleString()}</span></div>
                    ${features ? `<div class="features-container" style="margin-top:20px;"><h3>Key Features</h3><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">${features}</div></div>` : ''}
                    <div class="suitability-section" style="margin-top:25px;">
                        <div class="suit-item"><span>City</span><div class="stars">${suitability(car.suitability_city || 3)}</div></div>
                        <div class="suit-item"><span>Long</span><div class="stars">${suitability(car.suitability_long_drive || 4)}</div></div>
                    </div>
                    <div class="pros-cons">
                        <div class="pc-box pros"><h3>Pros</h3><ul>${pros}</ul></div>
                        <div class="pc-box cons"><h3>Cons</h3><ul>${cons}</ul></div>
                    </div>
                    <div class="insights-tabs">
                        <div class="calculator-section glass">
                            <h3>EMI</h3><div class="emi-result"><strong>₹${(insights.estimated_monthly_emi || 0).toLocaleString()}</strong></div>
                        </div>
                    </div>
                    <div class="modal-actions" style="display: flex; gap: 15px;">
                        <button class="btn btn-secondary" onclick="addToWishlist(${car.id})"><i class="fa-solid fa-heart"></i> Wishlist</button>
                        <button class="btn btn-primary" style="flex: 1;" onclick="openQueryModal(${car.id}, '${car.brand} ${car.model}')"><i class="fa-solid fa-envelope"></i> Query Admin</button>
                    </div>
                </div>
            </div>
        `;
    },

    createComparisonTable(cars) {
        if (!cars || cars.length === 0) return '<p>No cars.</p>';
        const attributes = [
            { label: 'Price', key: 'price', prefix: '₹' },
            { label: 'Type', key: 'body_type' },
            { label: 'Fuel', key: 'fuel_type' },
            { label: 'Mileage', key: 'mileage' }
        ];
        let html = '<table class="compare-table"><thead><tr><th>Attribute</th>';
        cars.forEach(car => { html += `<th>${car.brand} ${car.model}</th>`; });
        html += '</tr></thead><tbody>';
        attributes.forEach(attr => {
            html += `<tr><td>${attr.label}</td>`;
            cars.forEach(car => {
                const val = car[attr.key];
                html += `<td>${attr.prefix || ''}${val ? val.toLocaleString() : 'N/A'}</td>`;
            });
            html += '</tr>';
        });
        return html + '</tbody></table>';
    },

    createRentalCarCard(car) {
        const image = car.image || car.image_url_front || 'https://via.placeholder.com/300x180';
        return `
            <div class="car-card">
                <div class="car-img" style="height: 220px;">
                    <img src="${image}" alt="${car.brand}" style="object-fit: cover; width: 100%; height: 100%;">
                    <div class="badge rental-badge">₹${(car.price_per_day || 0).toLocaleString()}/day</div>
                </div>
                <div class="car-info">
                    <h4>${car.brand} ${car.model}</h4>
                    <div class="car-specs">
                        <span><i class="fa-solid fa-location-dot"></i> ${car.location || 'Pan India'}</span>
                        <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel_type}</span>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="openRentalModal(${car.id}, '${car.brand} ${car.model}')">Rent Now</button>
                </div>
            </div>
        `;
    },

    createRentalModal(car) {
        const user = JSON.parse(localStorage.getItem('user'));
        const image = car.image || car.image_url_front || 'https://via.placeholder.com/300x180';
        
        return `
            <div class="rental-modal-container">
                <div class="rental-modal-grid">
                    <!-- Left Column: Car Details & Info -->
                    <div class="rental-info-side">
                        <div class="selected-car-card glass">
                            <div class="availability-badge available">Available Now</div>
                            <img src="${image}" alt="${car.brand}" class="selected-car-img">
                            <div class="selected-car-info">
                                <h3>${car.brand} ${car.model}</h3>
                                <div class="car-meta-grid">
                                    <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel_type || 'Petrol'}</span>
                                    <span><i class="fa-solid fa-gears"></i> ${car.transmission || 'Manual'}</span>
                                    <span><i class="fa-solid fa-chair"></i> ${car.seats || 5} Seats</span>
                                    <span><i class="fa-solid fa-tag"></i> ₹${(car.price_per_day || car.price || 0).toLocaleString()}/day</span>
                                </div>
                            </div>
                        </div>

                        <div class="insurance-section glass">
                            <h4><i class="fa-solid fa-shield-halved"></i> Insurance Information</h4>
                            <p>Comprehensive insurance included. Covers accidental damage and third-party liability with a minimal deductible.</p>
                        </div>

                        <div class="ratings-preview glass">
                            <h4><i class="fa-solid fa-star"></i> Ratings & Reviews</h4>
                            <div class="rating-flex">
                                <span class="rating-score">4.8/5</span>
                                <div class="stars">
                                    <i class="fa-solid fa-star active"></i>
                                    <i class="fa-solid fa-star active"></i>
                                    <i class="fa-solid fa-star active"></i>
                                    <i class="fa-solid fa-star active"></i>
                                    <i class="fa-solid fa-star-half-stroke active"></i>
                                </div>
                                <span class="review-count">(128 reviews)</span>
                            </div>
                        </div>

                        <div class="booked-dates-section glass">
                            <h4><i class="fa-solid fa-calendar-circle-exclamation"></i> Existing Bookings</h4>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px;">The following dates are already reserved for this car:</p>
                            <div id="booked-dates-list" class="booked-dates-list">
                                <span class="loading-dates">Checking availability...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Booking Form -->
                    <div class="rental-form-side">
                        <form id="rental-form">
                            <input type="hidden" id="rental-car-id" value="${car.id}">
                            
                            <div class="form-section">
                                <h4><i class="fa-solid fa-user"></i> Personal Details</h4>
                                <div class="form-group">
                                    <label>Full Name</label>
                                    <input type="text" id="rental-user-name" value="${user ? user.name : ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Pickup Location</label>
                                    <input type="text" id="rental-location" placeholder="Enter city or airport" required>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4><i class="fa-solid fa-calendar-days"></i> Rental Period</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Pickup</label>
                                        <input type="text" id="rental-pickup-date" readonly placeholder="Select Date" required>
                                        <input type="time" id="rental-pickup-time" value="09:00" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Return</label>
                                        <input type="text" id="rental-return-date" readonly placeholder="Select Date" required>
                                        <input type="time" id="rental-return-time" value="18:00" required>
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4><i class="fa-solid fa-steering-wheel"></i> Driver Option</h4>
                                <div class="driver-options">
                                    <label class="radio-card">
                                        <input type="radio" name="driver-option" value="self" checked onchange="updateRentalSummary()">
                                        <div class="radio-content">
                                            <i class="fa-solid fa-user"></i>
                                            <span>Self Drive</span>
                                        </div>
                                    </label>
                                    <label class="radio-card">
                                        <input type="radio" name="driver-option" value="driver" onchange="updateRentalSummary()">
                                        <div class="radio-content">
                                            <i class="fa-solid fa-id-card"></i>
                                            <span>With Driver</span>
                                        </div>
                                    </label>
                                </div>
                                <div id="driver-selection-container" style="display: none; margin-top: 15px;">
                                    <label style="font-size: 0.8rem; color: var(--primary-color); display: block; margin-bottom: 8px;">Select Driver</label>
                                    <div id="driver-list-grid" class="driver-list-grid">
                                        <!-- Drivers injected here -->
                                    </div>
                                    <input type="hidden" id="selected-driver-id" value="">
                                    <div id="selected-driver-details" style="display: none; margin-top: 15px; padding: 15px; background: rgba(0, 191, 166, 0.05); border: 1px solid var(--secondary-color); border-radius: 8px;">
                                        <!-- Driver details injected here -->
                                    </div>
                                </div>
                            </div>

                            <div class="form-section">
                                <h4><i class="fa-solid fa-cloud-arrow-up"></i> Required Documents</h4>
                                <div class="upload-grid">
                                    <div class="upload-box" onclick="this.querySelector('input').click()">
                                        <input type="file" hidden id="license-upload" accept=".jpg,.jpeg,.png,.pdf">
                                        <img class="upload-preview" id="license-preview">
                                        <i class="fa-solid fa-id-badge"></i>
                                        <span>Driving License</span>
                                        <small>Drag & drop or click</small>
                                        <div class="error-msg" id="license-error"></div>
                                    </div>
                                    <div class="upload-box" onclick="this.querySelector('input').click()">
                                        <input type="file" hidden id="id-upload" accept=".jpg,.jpeg,.png,.pdf">
                                        <img class="upload-preview" id="id-preview">
                                        <i class="fa-solid fa-address-card"></i>
                                        <span>ID Proof (Aadhar/Passport)</span>
                                        <small>Drag & drop or click</small>
                                        <div class="error-msg" id="id-error"></div>
                                    </div>
                                </div>
                            </div>

                            

                            <div class="summary-card glass">
                                <h4>Booking Summary</h4>
                                <div class="summary-row"><span>Total Days</span> <span id="summary-days">0</span></div>
                                <div class="summary-row"><span>Base Amount</span> <span id="summary-base">₹0</span></div>
                                <div class="summary-row"><span>Taxes (18% GST)</span> <span id="summary-taxes">₹0</span></div>
                                <div class="summary-row"><span>Security Deposit</span> <span id="summary-deposit">₹2,000</span></div>
                                <div class="summary-divider"></div>
                                <div class="summary-row total"><span>Final Payable</span> <span id="summary-total">₹2,000</span></div>
                            </div>

                            <div class="terms-group">
                                <label class="checkbox-container">
                                    <input type="checkbox" required>
                                    <span class="checkmark"></span>
                                    I agree to the <a href="#">Terms and Conditions</a>
                                </label>
                            </div>

                            <button type="submit" class="btn btn-primary btn-block btn-lg glow-button">Confirm Booking</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    createQueryModal(carId, carName) {
        const user = JSON.parse(localStorage.getItem('user'));
        return `
            <div class="query-form-container" style="padding: 20px;">
                <h3 style="text-align: center; color: var(--primary-color); margin-bottom: 20px;">Query: ${carName}</h3>
                <form id="query-form">
                    <input type="hidden" id="query-car-id" value="${carId}">
                    <div class="form-group"><label>Your Name</label><input type="text" id="query-user-name" value="${user ? user.name : ''}" required></div>
                    <div class="form-group"><label>Subject</label><input type="text" id="query-subject" placeholder="e.g., Availability, Features, Price..." required></div>
                    <div class="form-group"><label>Your Message</label><textarea id="query-message" rows="4" style="width:100%; padding:12px; border-radius:8px; background:var(--surface-color); color:white; border:1px solid var(--surface-border);" placeholder="Write your query here..." required></textarea></div>
                    <button type="submit" class="btn btn-primary btn-block">Send Message</button>
                </form>
            </div>
        `;
    }
};

window.UIComponents = components;
