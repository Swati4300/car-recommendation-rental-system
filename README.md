# 🚗 Car Recommendation & Rental System

A full-stack web app where users can discover cars, compare them, save favourites and book rentals, with an admin panel to manage cars and bookings.

## Features
**For users**
- **Smart car recommendations:** Recommends cars tailored to user budget, fuel preference, body type, and usage suitability (city driving, long trips, or family use).
- **Advanced filtering:** Filter cars by budget range, body type, fuel type, transmission, seating capacity, and location.
- **Car comparison:** Compare specs, features, pros & cons, and pricing side by side.
- **Car details page:** Comprehensive specs, engine stats, safety ratings, multi-angle images, and rental price per day.
- **Wishlist / favourites:** Save favorite cars for quick access and later comparison.
- **Rental booking & My Bookings:** Book self-drive or driver-driven rentals, upload verification documents, and track booking statuses.
- **Online payments:** Integrated Razorpay payment gateway (test mode) for secure online rental payments.
- **User authentication & profile dashboard:** User registration, login, profile management, and rental history tracking.

**For admins**
- Admin login and dashboard to add/manage vehicles, view rental requests, assign drivers, and handle customer messages.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| Database | MySQL |
| Payments | Razorpay (test mode) |

## Screenshots
![Home]
<img width="1920" height="914" alt="image" src="https://github.com/user-attachments/assets/63473e10-5cda-4154-a6ef-d60c3e4bb9b6" />

## Setup
1. Clone the repo:
   `git clone https://github.com/Swati4300/car-recommendation-rental-system.git`
2. Create a MySQL database and import `backend/schema.sql`
3. `cd backend`
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in your MySQL and Razorpay details
6. `python app.py`
7. Open the frontend `index.html` (or the URL the app prints)

## Project Structure
backend/    Flask app, schema.sql, requirements.txt
frontend/   HTML, CSS, JS pages
docs/       Module documentation

## Future Improvements
- ML-driven personalized recommendation engine based on user preferences and search trends.
- Real-time rating and user review system for cars and assigned drivers.
- Automated email and SMS notifications for booking status updates.

## Author
Swati Yallurkar
