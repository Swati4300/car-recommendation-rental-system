document.addEventListener('DOMContentLoaded', () => {
    // 1. Unified RBAC Protection
    const user = JSON.parse(localStorage.getItem('user'));
    const layout = document.getElementById('main-admin-layout');

    if (user && user.role === 'admin') {
        // Authorized
        if (layout) layout.classList.add('authenticated');
        initDashboard();
    } else {
        // Unauthorized - Redirect to Home
        alert("Access Denied: Admin privileges required.");
        window.location.href = 'index.html';
        return;
    }
});

const API_BASE = 'http://127.0.0.1:5000/api';

function initDashboard() {
    loadStats();
    loadAdminCars();
    loadAdminBookings();
    loadAdminDrivers();
    loadAdminMessages();

}

// --- Navigation ---
window.switchSection = (sectionId, element) => {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update Sidebar CSS
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    // REFRESH DATA based on section
    if (sectionId === 'overview') loadStats();
    if (sectionId === 'cars') loadAdminCars();
    if (sectionId === 'bookings') loadAdminBookings();
    if (sectionId === 'drivers') loadAdminDrivers();
    if (sectionId === 'messages') loadAdminMessages();
};

window.adminLogout = () => {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};

// --- Stats ---
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`);
        const data = await res.json();
        if (document.getElementById('stat-total-cars')) document.getElementById('stat-total-cars').innerText = data.total_cars;
        if (document.getElementById('stat-total-bookings')) document.getElementById('stat-total-bookings').innerText = data.total_bookings;
        if (document.getElementById('stat-active-rentals')) document.getElementById('stat-active-rentals').innerText = data.active_rentals;
    } catch (err) { console.error("Stats fail", err); }
}

// --- Car Management ---
async function loadAdminCars() {
    const tbody = document.getElementById('admin-car-table-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/cars`);
        const cars = await res.json();
        
        if (!cars || cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No cars found.</td></tr>';
            return;
        }

        tbody.innerHTML = cars.map(car => `
            <tr>
                <td><img src="${car.image_url_front}" width="50" style="border-radius: 4px;"></td>
                <td>${car.brand} ${car.model}</td>
                <td>₹${car.price.toLocaleString()}</td>
                <td>₹${car.price_per_day.toLocaleString()}</td>
                <td>${car.fuel_type}</td>
                <td class="action-btns">
                    <button class="btn-edit" title="Edit" onclick='openEditCarModal(${JSON.stringify(car).replace(/'/g, "&apos;")})'><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" title="Delete" onclick="deleteCar(${car.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) { 
        console.error("Cars load failed", err); 
        tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Failed to fetch cars from API.</td></tr>';
    }
}

// --- Booking Management ---
async function loadAdminBookings() {
    const tbody = document.getElementById('admin-booking-table-body');
    if (!tbody) return;

    try {
        console.log("Admin: Fetching from " + `${API_BASE}/bookings`);
        const res = await fetch(`${API_BASE}/bookings`);
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Server returned ${res.status}`);
        }

        const bookings = await res.json();
        console.log("Admin: Received Data:", bookings);

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No rental requests found in database.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const userName = b.user_name || 'Unknown User';
            const carName = `${b.brand || 'Unknown'} ${b.model || 'Vehicle'}`;
            const pickup = b.pickup_date || 'N/A';
            const dropoff = b.return_date || 'N/A';
            const loc = b.location || 'N/A';
            const payment = b.payment_method || 'Not Specified';
            const payStatus = b.payment_status || 'Pending';
            const status = b.status || 'Pending';
            const statusLower = status.toLowerCase();

            let totalPayable = '₹0';
            if (b.pickup_date && b.return_date) {
                const diff = Math.abs(new Date(b.return_date) - new Date(b.pickup_date));
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
                const price = b.price_per_day || 0;
                const base = days * price;
                const total = base + (base * 0.18) + 2000;
                totalPayable = `₹${total.toLocaleString()}`;
            }

            return `
                <tr id="booking-row-${b.id}">
                    <td style="font-weight:600;">${userName}</td>
                    <td><span style="color:var(--primary-color);">${carName}</span></td>
                    <td><div style="font-size:0.8rem;">${pickup}</div><div style="font-size:0.7rem; color:var(--text-muted);">to ${dropoff}</div></td>
                    <td><i class="fa-solid fa-location-dot"></i> ${loc}</td>
                    <td>
                        <div style="font-weight:700; color:var(--secondary-color);">${totalPayable}</div>
                        <span class="status-badge ${payStatus === 'Paid' ? 'status-approved' : 'status-pending'}" style="font-size:0.6rem; padding:2px 5px;">${payStatus}</span>
                    </td>
                    <td><span class="status-badge status-${statusLower}">${status}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick='viewBookingDetails(${JSON.stringify(b).replace(/'/g, "&apos;")})'>
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                    <td class="action-btns">
                        ${status === 'Pending' ? `
                            <button class="btn-approve" onclick="updateStatus(${b.id}, 'Approved')" title="Approve"><i class="fa-solid fa-check"></i></button>
                            <button class="btn-reject" onclick="updateStatus(${b.id}, 'Rejected')" title="Reject"><i class="fa-solid fa-xmark"></i></button>
                        ` : ''}
                        ${status === 'Confirmed' ? `<button class="btn btn-secondary btn-sm" onclick="startTracking('${carName}', '${loc}')"><i class="fa-solid fa-location-crosshairs"></i> Track</button>` : ''}
                        <button class="btn-delete" onclick="deleteBooking(${b.id})" title="Delete Record"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) { 
        console.error("CRITICAL ADMIN ERROR:", err); 
        showToast("Failed to load bookings", "error");
        tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:20px;">Error: ${err.message}</td></tr>`;
    }
}

// --- Deletion Logic ---
let bookingIdToDelete = null;

window.deleteBooking = (id) => {
    bookingIdToDelete = id;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeDeleteModal = () => {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.style.display = 'none';
    bookingIdToDelete = null;
};

document.getElementById('confirm-delete-btn').onclick = async () => {
    if (!bookingIdToDelete) return;

    const btn = document.getElementById('confirm-delete-btn');
    const originalText = btn.innerText;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/admin/delete-booking/${bookingIdToDelete}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            // Instant UI update
            const row = document.getElementById(`booking-row-${bookingIdToDelete}`);
            if (row) {
                row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                setTimeout(() => row.remove(), 300);
            }
            showToast("Booking deleted successfully", "success");
            loadStats(); // Update totals in overview
        } else {
            const data = await res.json();
            showToast(data.error || "Failed to delete booking", "error");
        }
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Server error during deletion", "error");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        closeDeleteModal();
    }
};

// --- Toast System ---
window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

window.viewBookingDetails = (b) => {

    const modal = document.getElementById('admin-booking-modal');
    const content = document.getElementById('admin-booking-details-content');
    if (!modal || !content) return;

    // Calculate breakdown
    const diff = Math.abs(new Date(b.return_date) - new Date(b.pickup_date));
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
    const price = b.price_per_day || 0;
    const base = days * price;
    const taxes = base * 0.18;
    const deposit = 2000;
    const total = base + taxes + deposit;

    const licenseUrl = b.license_path ? `${API_BASE}/uploads/${b.license_path}` : null;
    const idProofUrl = b.id_proof_path ? `${API_BASE}/uploads/${b.id_proof_path}` : null;

    content.innerHTML = `
        <div class="admin-details-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div class="details-left">
                <h4 style="color:var(--primary-color); margin-bottom:15px; border-bottom:1px solid var(--surface-border); padding-bottom:5px;">Vehicle & User</h4>
                <p><strong>Customer:</strong> ${b.user_name}</p>
                <p><strong>Vehicle:</strong> ${b.brand} ${b.model}</p>
                <p><strong>Fuel Type:</strong> ${b.fuel_type || 'N/A'}</p>
                <p><strong>Daily Rate:</strong> ₹${(b.price_per_day || 0).toLocaleString()}</p>
                
                <h4 style="color:var(--primary-color); margin-top:25px; margin-bottom:15px; border-bottom:1px solid var(--surface-border); padding-bottom:5px;">Rental Period</h4>
                <p><strong>Pickup:</strong> ${b.pickup_date} at ${b.pickup_time || '09:00'}</p>
                <p><strong>Return:</strong> ${b.return_date} at ${b.return_time || '18:00'}</p>
                <p><strong>Location:</strong> ${b.location}</p>
                <p><strong>Total Duration:</strong> ${days} Day(s)</p>
            </div>
            
            <div class="details-right">
                <h4 style="color:var(--primary-color); margin-bottom:15px; border-bottom:1px solid var(--surface-border); padding-bottom:5px;">Financial Summary</h4>
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:10px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Base Amount:</span> <span>₹${base.toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Taxes (18%):</span> <span>₹${taxes.toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Security Deposit:</span> <span>₹${deposit.toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid var(--surface-border); font-weight:700; color:var(--secondary-color);">
                        <span>Final Payable:</span> <span>₹${total.toLocaleString()}</span>
                    </div>
                </div>
                
                <h4 style="color:var(--primary-color); margin-top:25px; margin-bottom:15px; border-bottom:1px solid var(--surface-border); padding-bottom:5px;">Additional Info</h4>
                <p><strong>Driver Option:</strong> <span class="status-badge" style="background:var(--surface-color); color:var(--text-main);">${b.driver_option || 'Self Drive'}</span></p>
                <p><strong>Coupon Used:</strong> <span style="color:var(--accent-color);">${b.coupon_code || 'None'}</span></p>
                <p><strong>Payment Method:</strong> ${b.payment_method || 'N/A'}</p>
            </div>
        </div>

        <div class="admin-docs-section" style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed var(--surface-border);">
            <h4 style="color:var(--primary-color); margin-bottom:15px;">Uploaded Documents</h4>
            <div style="display: flex; gap: 20px;">
                <div class="doc-preview" style="flex: 1; aspect-ratio: 16/9; background: var(--surface-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--surface-border); overflow: hidden; position: relative;">
                    ${licenseUrl ? `
                        <img src="${licenseUrl}" style="width:100%; height:100%; object-fit:cover; opacity: 0.5;">
                        <div style="position:absolute; text-align:center; z-index:2;">
                            <i class="fa-solid fa-id-badge" style="font-size: 2rem; color: #fff; margin-bottom: 10px;"></i>
                            <p style="font-size: 0.8rem; color: #fff;">Driving License</p>
                            <button class="btn btn-primary btn-sm" onclick="window.open('${licenseUrl}', '_blank')">View Full Size</button>
                        </div>
                    ` : `
                        <div style="text-align: center; opacity: 0.5;">
                            <i class="fa-solid fa-file-circle-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
                            <p style="font-size: 0.8rem;">No License Uploaded</p>
                        </div>
                    `}
                </div>
                <div class="doc-preview" style="flex: 1; aspect-ratio: 16/9; background: var(--surface-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--surface-border); overflow: hidden; position: relative;">
                    ${idProofUrl ? `
                        <img src="${idProofUrl}" style="width:100%; height:100%; object-fit:cover; opacity: 0.5;">
                        <div style="position:absolute; text-align:center; z-index:2;">
                            <i class="fa-solid fa-address-card" style="font-size: 2rem; color: #fff; margin-bottom: 10px;"></i>
                            <p style="font-size: 0.8rem; color: #fff;">Aadhar / ID Proof</p>
                            <button class="btn btn-primary btn-sm" onclick="window.open('${idProofUrl}', '_blank')">View Full Size</button>
                        </div>
                    ` : `
                        <div style="text-align: center; opacity: 0.5;">
                            <i class="fa-solid fa-file-circle-xmark" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 10px;"></i>
                            <p style="font-size: 0.8rem;">No ID Proof Uploaded</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

// --- Modals & CRUD ---

window.openAddCarModal = () => {
    document.getElementById('modal-title').innerText = "Add New Car";
    const form = document.getElementById('admin-car-form');
    if (form) form.reset();
    document.getElementById('edit-car-id').value = "";
    document.getElementById('admin-car-modal').style.display = 'flex';
};

window.openEditCarModal = (car) => {
    document.getElementById('modal-title').innerText = "Edit Car";
    document.getElementById('edit-car-id').value = car.id;
    document.getElementById('admin-car-brand').value = car.brand;
    document.getElementById('admin-car-model').value = car.model;
    document.getElementById('admin-car-price').value = car.price;
    document.getElementById('admin-car-price-day').value = car.price_per_day;
    document.getElementById('admin-car-body').value = car.body_type;
    
    // Set checkboxes for fuel type
    const fuelTypes = (car.fuel_type || '').split(',').map(f => f.trim());
    document.querySelectorAll('input[name="admin-fuel"]').forEach(cb => {
        cb.checked = fuelTypes.includes(cb.value);
    });

    document.getElementById('admin-car-location').value = car.location || '';
    document.getElementById('admin-car-seats').value = car.seats || 5;
    document.getElementById('admin-car-avail-from').value = car.available_from || '';
    document.getElementById('admin-car-avail-until').value = car.available_until || '';
    document.getElementById('admin-car-features').value = car.features || '';
    document.getElementById('admin-car-image').value = car.image_url_front;
    document.getElementById('admin-car-modal').style.display = 'flex';
};

// --- Form Submission ---
if (document.getElementById('admin-car-form')) {
    document.getElementById('admin-car-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-car-id').value;
        
        // Collect checked fuel types
        const selectedFuel = Array.from(document.querySelectorAll('input[name="admin-fuel"]:checked')).map(cb => cb.value).join(', ');

        const data = {
            brand: document.getElementById('admin-car-brand').value,
            model: document.getElementById('admin-car-model').value,
            price: document.getElementById('admin-car-price').value,
            price_per_day: document.getElementById('admin-car-price-day').value,
            body_type: document.getElementById('admin-car-body').value,
            fuel_type: selectedFuel,
            location: document.getElementById('admin-car-location').value,
            seats: document.getElementById('admin-car-seats').value,
            available_from: document.getElementById('admin-car-avail-from').value,
            available_until: document.getElementById('admin-car-avail-until').value,
            features: document.getElementById('admin-car-features').value,
            image_url: document.getElementById('admin-car-image').value
        };

        try {
            const url = id ? `${API_BASE}/update-car` : `${API_BASE}/add-car`;
            const method = id ? 'PUT' : 'POST';
            if (id) data.id = id;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                alert(id ? "Car updated!" : "Car added!");
                closeAdminModal();
                loadAdminCars();
            } else {
                const err = await res.json();
                alert("Failed: " + err.error);
            }
        } catch (err) { alert("Server error during save"); }
    };
}

window.closeAdminModal = () => {
    document.getElementById('admin-car-modal').style.display = 'none';
};

window.deleteCar = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
        await fetch(`${API_BASE}/delete-car/${id}`, { method: 'DELETE' });
        loadAdminCars();
        loadStats();
    } catch (err) { alert("Delete failed"); }
};

window.updateStatus = async (id, status) => {
    try {
        const res = await fetch(`${API_BASE}/update-booking-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: id, status: status })
        });
        if (res.ok) {
            loadAdminBookings();
            loadStats();
        }
    } catch (err) { alert("Update failed"); }
};

// --- Live Tracking ---
let trackingMap = null;
let trackingMarker = null;
let trackingInterval = null;

window.startTracking = (carName, location) => {
    document.getElementById('tracking-title').innerText = `Tracking: ${carName}`;
    document.getElementById('tracking-modal').style.display = 'flex';
    
    // Initialize Map if not exists
    if (!trackingMap) {
        trackingMap = L.map('tracking-map').setView([19.0760, 72.8777], 13); // Default Mumbai
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackingMap);
    }

    // Mock City Coordinates
    const coords = {
        'Mumbai': [19.0760, 72.8777],
        'Delhi': [28.6139, 77.2090],
        'Bangalore': [12.9716, 77.5946],
        'Pune': [18.5204, 73.8567],
        'Hyderabad': [17.3850, 78.4867]
    };
    
    const startPoint = coords[location] || coords['Mumbai'];
    trackingMap.setView(startPoint, 14);

    if (trackingMarker) trackingMap.removeLayer(trackingMarker);
    
    // Custom Car Icon
    const carIcon = L.divIcon({
        html: '<i class="fa-solid fa-car-side" style="font-size: 24px; color: #6c63ff;"></i>',
        className: 'custom-car-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    trackingMarker = L.marker(startPoint, { icon: carIcon }).addTo(trackingMap);

    // Simulation logic
    let lat = startPoint[0];
    let lng = startPoint[1];
    
    if (trackingInterval) clearInterval(trackingInterval);
    
    trackingInterval = setInterval(() => {
        // Random slight movement to simulate driving
        lat += (Math.random() - 0.5) * 0.002;
        lng += (Math.random() - 0.5) * 0.002;
        
        const newPos = [lat, lng];
        trackingMarker.setLatLng(newPos);
        trackingMap.panTo(newPos);

        // Update stats
        document.getElementById('track-speed').innerText = `${Math.floor(Math.random() * 40 + 20)} km/h`;
        document.getElementById('track-time').innerText = new Date().toLocaleTimeString();
    }, 2000);
};

window.closeTrackingModal = () => {
    document.getElementById('tracking-modal').style.display = 'none';
    if (trackingInterval) clearInterval(trackingInterval);
};

// --- Message Management ---
async function loadAdminMessages() {
    const tbody = document.getElementById('admin-message-table-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/admin/messages`);
        const messages = await res.json();
        
        if (!messages || messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No customer queries yet.</td></tr>';
            return;
        }

        tbody.innerHTML = messages.map(m => `
            <tr>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td><strong>${m.user_name}</strong></td>
                <td>${m.brand ? `${m.brand} ${m.model}` : 'General Inquiry'}</td>
                <td>${m.subject}</td>
                <td><span class="status-badge status-${m.status.toLowerCase()}">${m.status}</span></td>
                <td class="action-btns">
                    <button class="btn-edit" title="View Detail" onclick='viewMessageDetail(${JSON.stringify(m).replace(/'/g, "&apos;")})'><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-delete" title="Delete Query" onclick="deleteMessage(${m.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error("Messages load fail", err); }
}

let currentMsgId = null;
window.viewMessageDetail = (m) => {
    currentMsgId = m.id;
    const content = `
        <div style="margin-bottom: 20px;">
            <p style="color:var(--primary-color); font-weight:600; font-size:1.1rem;">From: ${m.user_name}</p>
            <p style="font-size:0.9rem; color:var(--text-muted);">Vehicle: ${m.brand ? `${m.brand} ${m.model}` : 'N/A'}</p>
            <p style="font-size:0.9rem; color:var(--text-muted);">Subject: ${m.subject}</p>
        </div>
        <div style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; line-height: 1.6; color: #fff; min-height: 100px;">
            ${m.message}
        </div>
        ${m.reply_text ? `
            <div style="margin-top:20px; padding: 15px; border-left: 3px solid var(--primary-color); background: rgba(108, 99, 255, 0.1);">
                <p style="font-size:0.7rem; color:var(--primary-color); text-transform:uppercase; margin-bottom:5px;">Your Previous Reply:</p>
                <div style="color:white; font-size:0.9rem;">${m.reply_text}</div>
            </div>
        ` : ''}
    `;
    document.getElementById('msg-modal-content').innerHTML = content;
    document.getElementById('reply-section').style.display = 'none';
    document.getElementById('msg-modal-actions').style.display = 'flex';
    document.getElementById('admin-message-modal').style.display = 'flex';
};

window.showReplySection = () => {
    document.getElementById('reply-section').style.display = 'block';
    document.getElementById('msg-modal-actions').style.display = 'none';
};

window.sendAdminReply = async () => {
    const text = document.getElementById('admin-reply-text').value;
    if (!text) return alert("Please type a reply");
    
    try {
        const res = await fetch(`${API_BASE}/admin/reply-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: currentMsgId, reply_text: text })
        });
        if (res.ok) {
            alert("Reply sent to customer inbox!");
            document.getElementById('admin-reply-text').value = '';
            closeMessageModal();
            loadAdminMessages();
        }
    } catch (err) { alert("Failed to send reply"); }
};

window.markAsRead = async () => {
    if (!currentMsgId) return;
    try {
        const res = await fetch(`${API_BASE}/admin/update-message-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: currentMsgId, status: 'Read' })
        });
        if (res.ok) {
            closeMessageModal();
            loadAdminMessages();
        }
    } catch (err) { alert("Failed to update status"); }
};

window.deleteMessage = async (id) => {
    if (!confirm("Are you sure you want to delete this customer query?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/delete-message/${id}`, { method: 'DELETE' });
        if (res.ok) loadAdminMessages();
    } catch (err) { alert("Delete failed"); }
};

window.closeMessageModal = () => {
    document.getElementById('admin-message-modal').style.display = 'none';
};

// --- Driver Management ---

async function loadAdminDrivers() {
    const tbody = document.getElementById('admin-driver-table-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/drivers`);
        const drivers = await res.json();
        
        if (!drivers || drivers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No drivers added yet.</td></tr>';
            return;
        }

        tbody.innerHTML = drivers.map(d => {
            const rating = d.rating || 5;
            let starsHTML = '';
            for(let i=1; i<=5; i++) {
                starsHTML += `<i class="fa-solid fa-star" style="color: ${i <= rating ? '#FFD700' : 'var(--surface-border)'}; font-size: 0.7rem;"></i>`;
            }
            return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${d.image_url || 'https://via.placeholder.com/40'}" width="40" height="40" style="border-radius: 50%; object-fit: cover;">
                        <div>
                            <strong>${d.name}</strong>
                            <div style="display: flex; gap: 2px; margin-top: 3px;">${starsHTML}</div>
                        </div>
                    </div>
                </td>
                <td>${d.license_no || 'N/A'}</td>
                <td>
                    ${d.experience || '0'} Years
                    ${d.languages ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Speaks: ${d.languages}</div>` : ''}
                </td>
                <td>${d.phone || 'N/A'}</td>
                <td><span class="status-badge status-${d.status.replace(' ', '').toLowerCase()}">${d.status}</span></td>
                <td class="action-btns">
                    <button class="btn-delete" title="Delete" onclick="deleteDriver(${d.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `}).join('');
    } catch (err) { console.error("Drivers load fail", err); }
}

window.openAddDriverModal = () => {
    const form = document.getElementById('admin-driver-form');
    if (form) form.reset();
    document.getElementById('edit-driver-id').value = "";
    document.getElementById('admin-driver-modal').style.display = 'flex';
};

window.closeDriverModal = () => {
    document.getElementById('admin-driver-modal').style.display = 'none';
};

if (document.getElementById('admin-driver-form')) {
    document.getElementById('admin-driver-form').onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('driver-name').value);
        formData.append('license_no', document.getElementById('driver-license').value);
        formData.append('experience', document.getElementById('driver-exp').value);
        formData.append('phone', document.getElementById('driver-phone').value);
        formData.append('status', document.getElementById('driver-status').value);
        formData.append('languages', document.getElementById('driver-languages').value);
        formData.append('rating', document.getElementById('driver-rating').value);

        const imageFile = document.getElementById('driver-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        try {
            const res = await fetch(`${API_BASE}/add-driver`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert("Driver added successfully!");
                closeDriverModal();
                loadAdminDrivers();
            } else {
                const err = await res.json();
                alert("Failed: " + err.error);
            }
        } catch (err) { alert("Server error during save"); }
    };
}

window.deleteDriver = async (id) => {
    if (!confirm("Are you sure you want to remove this driver?")) return;
    try {
        const res = await fetch(`${API_BASE}/admin/delete-driver/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Driver removed successfully", "success");
            loadAdminDrivers();
        }
    } catch (err) { alert("Delete failed"); }
};
