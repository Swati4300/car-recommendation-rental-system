const API_BASE_URL = (window.location.protocol.startsWith('http') && window.location.host)
    ? `${window.location.origin}/api`
    : 'http://127.0.0.1:5000/api';

const api = {
    async getCars(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_BASE_URL}/cars?${queryParams}`);
        return await response.json();
    },

    async getCarDetails(carId) {
        const response = await fetch(`${API_BASE_URL}/cars/${carId}`);
        return await response.json();
    },

    async getRecommendations(preferences) {
        const response = await fetch(`${API_BASE_URL}/recommend-cars`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(preferences)
        });
        return await response.json();
    },

    async compareCars(carIds) {
        const response = await fetch(`${API_BASE_URL}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_ids: carIds })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `Server Error ${response.status}`);
        }
        return await response.json();
    },

    async getWishlist(userId) {
        const response = await fetch(`${API_BASE_URL}/wishlist?user_id=${userId}`);
        return await response.json();
    },

    async addToWishlist(userId, carId) {
        const response = await fetch(`${API_BASE_URL}/wishlist?user_id=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_id: carId })
        });
        return await response.json();
    },

    async removeFromWishlist(userId, carId) {
        const response = await fetch(`${API_BASE_URL}/wishlist?user_id=${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_id: carId })
        });
        return await response.json();
    },

    async getMarketInsights(carId, price) {
        const response = await fetch(`${API_BASE_URL}/market-insights?car_id=${carId}&price=${price}`);
        return await response.json();
    },

    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await response.json();
    },

    async register(name, email, password) {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        return await response.json();
    },

    async updateProfile(userId, data) {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, ...data })
        });
        return await response.json();
    },

    async getHistory(userId) {
        const response = await fetch(`${API_BASE_URL}/history?user_id=${userId}`);
        return await response.json();
    },

    async logHistory(userId, carId) {
        const response = await fetch(`${API_BASE_URL}/history?user_id=${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ car_id: carId })
        });
        return await response.json();
    },

    async rentCar(bookingData) {
        const response = await fetch(`${API_BASE_URL}/rent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        return await response.json();
    },

    async addCar(carData) {
        const response = await fetch(`${API_BASE_URL}/add-car`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(carData)
        });
        return await response.json();
    }
};

window.DriveAPI = api;
