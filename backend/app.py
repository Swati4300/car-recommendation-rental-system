from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import json
import os
from datetime import datetime, date
import uuid
from dotenv import load_dotenv

load_dotenv()

try:
    import razorpay
    RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', 'rzp_test_YourTestKeyIdHere')
    RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', 'YourTestKeySecretHere')
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except ImportError:
    print("WARNING: 'razorpay' package is missing. Payments will not work. Run: pip install razorpay")
    razorpay_client = None
    RAZORPAY_KEY_ID = None

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- DATABASE CONFIGURATION ---
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'car_recommendation')
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def init_db():
    print("--- Starting Database Initialization ---")
    try:
        init_config = db_config.copy()
        init_config.pop('database', None)
        conn = mysql.connector.connect(**init_config)
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS `car_recommendation` DEFAULT CHARACTER SET utf8mb4")
        cursor.close(); conn.close()

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(100) UNIQUE, password VARCHAR(255), role VARCHAR(20) DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
        
        cursor.execute("SHOW COLUMNS FROM users LIKE 'role'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER password")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cars (
                id INT AUTO_INCREMENT PRIMARY KEY, brand VARCHAR(50), model VARCHAR(50), price INT, price_per_day INT, 
                body_type VARCHAR(50), fuel_type VARCHAR(20), location VARCHAR(50), mileage VARCHAR(50), 
                engine VARCHAR(50), power INT, transmission VARCHAR(20), safety_rating INT, 
                suitability_city INT DEFAULT 3, suitability_long_drive INT DEFAULT 4, suitability_family INT DEFAULT 4,
                pros TEXT, cons TEXT, image_url_front VARCHAR(255), image_url_rear VARCHAR(255), 
                image_url_side VARCHAR(255), image_url_interior VARCHAR(255),
                description TEXT, seats INT DEFAULT 5, available_dates VARCHAR(255) DEFAULT 'All days', features TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ALTER TABLE for existing cars
        cursor.execute("SHOW COLUMNS FROM cars LIKE 'seats'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE cars ADD COLUMN seats INT DEFAULT 5")
        cursor.execute("SHOW COLUMNS FROM cars LIKE 'available_dates'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE cars ADD COLUMN available_dates VARCHAR(255) DEFAULT 'All days'")
        cursor.execute("SHOW COLUMNS FROM cars LIKE 'available_from'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE cars ADD COLUMN available_from DATE")
        cursor.execute("SHOW COLUMNS FROM cars LIKE 'available_until'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE cars ADD COLUMN available_until DATE")
        cursor.execute("SHOW COLUMNS FROM cars LIKE 'features'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE cars ADD COLUMN features TEXT")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY, user_name VARCHAR(100), car_id INT, 
                pickup_date DATE, pickup_time TIME DEFAULT '09:00:00',
                return_date DATE, return_time TIME DEFAULT '18:00:00',
                location VARCHAR(255), payment_method VARCHAR(50), payment_status ENUM('Pending', 'Paid') DEFAULT 'Pending',
                payment_id VARCHAR(100), status ENUM('Pending', 'Approved', 'Rejected', 'Confirmed') DEFAULT 'Pending', 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
            )
        """)

        # ALTER TABLE for existing bookings
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'pickup_time'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN pickup_time TIME DEFAULT '09:00:00' AFTER pickup_date")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'return_time'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN return_time TIME DEFAULT '18:00:00' AFTER return_date")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'license_path'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN license_path VARCHAR(255)")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'id_proof_path'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN id_proof_path VARCHAR(255)")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'driver_option'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN driver_option VARCHAR(50) DEFAULT 'Self Drive'")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'coupon_code'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN coupon_code VARCHAR(50)")
        cursor.execute("SHOW COLUMNS FROM bookings LIKE 'driver_id'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE bookings ADD COLUMN driver_id INT, ADD FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_name VARCHAR(100),
                car_id INT,
                subject VARCHAR(255),
                message TEXT,
                reply_text TEXT,
                status ENUM('New', 'Read', 'Replied') DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                replied_at TIMESTAMP NULL,
                FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS drivers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                license_no VARCHAR(50),
                experience VARCHAR(50),
                phone VARCHAR(20),
                image_url VARCHAR(255),
                status ENUM('Available', 'On Trip', 'Unavailable') DEFAULT 'Available',
                languages VARCHAR(255),
                rating INT DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("SHOW COLUMNS FROM drivers LIKE 'languages'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE drivers ADD COLUMN languages VARCHAR(255)")
        cursor.execute("SHOW COLUMNS FROM drivers LIKE 'rating'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE drivers ADD COLUMN rating INT DEFAULT 5")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT,
                razorpay_order_id VARCHAR(100),
                razorpay_payment_id VARCHAR(100),
                razorpay_signature VARCHAR(255),
                amount INT,
                currency VARCHAR(10) DEFAULT 'INR',
                method VARCHAR(50),
                status ENUM('Created', 'Success', 'Failed') DEFAULT 'Created',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("SHOW COLUMNS FROM messages LIKE 'reply_text'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE messages ADD COLUMN reply_text TEXT AFTER message")
        cursor.execute("SHOW COLUMNS FROM messages LIKE 'replied_at'")
        if cursor.fetchone() is None: cursor.execute("ALTER TABLE messages ADD COLUMN replied_at TIMESTAMP NULL AFTER created_at")
        
        conn.commit()

        # Seed Cars with Correct Mapping
        cursor.execute("SELECT COUNT(*) FROM cars")
        count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM cars WHERE image_url_front IS NULL")
        missing_images = cursor.fetchone()[0]

        if count == 0 or missing_images > 0:
            print("--- Re-seeding fleet to fix data issues ---")
            cursor.execute("DELETE FROM cars")
            seed_data = [
                ('Lamborghini', 'Huracan', 35000000, 85000, 'Sport', 'Petrol', 'Mumbai', '12 kmpl', '5.2L V10', 610, 'Automatic', 5, 'V10 Supercar', 'Extreme Speed, Sound, Style', 'High maintenance, Low ground clearance', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80'),
                ('Tesla', 'Model X', 12000000, 25000, 'SUV', 'Electric', 'Delhi', '450 km', 'Dual Electric', 670, 'Automatic', 5, 'Falcon Wings', 'Insane Acceleration, Tech, Space', 'Pricey, Falcon doors need space', 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=800&q=80'),
                ('Mercedes-Benz', 'G-Class', 25500000, 45000, 'SUV', 'Petrol', 'Mumbai', '8 kmpl', '4.0L V8 Biturbo', 577, 'Automatic', 5, 'Luxury Off-roader', 'Presence, Capability, Luxury', 'Fuel efficiency', 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80'),
                ('Audi', 'R8 Spyder', 27200000, 75000, 'Convertible', 'Petrol', 'Bangalore', '10 kmpl', '5.2L V10', 562, 'Automatic', 5, 'German Masterpiece', 'Engine sound, Build quality', 'Limited cargo space', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80'),
                ('Porsche', '911 Carrera', 18500000, 55000, 'Sport', 'Petrol', 'Hyderabad', '14 kmpl', '3.0L Flat-6', 379, 'Automatic', 5, 'The Benchmark', 'Handling, Heritage', 'Expensive options', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'),
                ('Range Rover', 'Sport', 16500000, 32000, 'SUV', 'Hybrid', 'Bangalore', '15 kmpl', '3.0L I6 Hybrid', 395, 'Automatic', 5, 'Luxury redefined', 'Capability, Comfort', 'Reliability history', 'https://images.unsplash.com/photo-1563720223185-11003d516905?auto=format&fit=crop&w=800&q=80'),
                ('Ford', 'Mustang GT', 7500000, 18000, 'Coupe', 'Petrol', 'Delhi', '12 kmpl', '5.0L V8', 450, 'Manual', 5, 'V8 Muscle', 'Classic sound, Performance', 'Interior materials', 'https://images.unsplash.com/photo-1584345604482-81167ff8e333?auto=format&fit=crop&w=800&q=80'),
                ('BMW', 'M4 Competition', 14500000, 35000, 'Coupe', 'Petrol', 'Hyderabad', '13 kmpl', '3.0L I6', 503, 'Automatic', 5, 'Track focused', 'Precision handling, Power', 'Ride stiffness', 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=800&q=80'),
                ('Rolls-Royce', 'Ghost', 69500000, 150000, 'Luxury', 'Petrol', 'Mumbai', '9 kmpl', '6.75L V12', 563, 'Automatic', 5, 'Pure Luxury', 'Silence, Exclusivity', 'Massive size', 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80'),
                ('Jeep', 'Wrangler Rubicon', 6500000, 15000, 'SUV', 'Petrol', 'Pune', '12 kmpl', '2.0L Turbo', 270, 'Automatic', 4, 'Adventure ready', 'Go-anywhere ability', 'Wind noise', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80')
            ]
            cursor.executemany("INSERT INTO cars (brand, model, price, price_per_day, body_type, fuel_type, location, mileage, engine, power, transmission, safety_rating, description, pros, cons, image_url_front) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", seed_data)
            conn.commit()

        # Seed Admin
        cursor.execute("SELECT role FROM users WHERE email = %s", ('admin@themobhub.com',))
        admin_record = cursor.fetchone()

        # CLEANUP: Remove any standard users who used 'admin' as a name to avoid confusion
        print("--- Cleaning up conflicting 'admin' user records ---")
        cursor.execute("DELETE FROM users WHERE (name = 'admin' OR name = 'Admin') AND role = 'user'")
        conn.commit()

        if admin_record is None:
            print("--- Seeding default admin user ---")
            admin_pw = generate_password_hash('admin123')
            cursor.execute("INSERT INTO users (name, email, password, role) VALUES (%s,%s,%s,%s)", ('Admin', 'admin@themobhub.com', admin_pw, 'admin'))
            conn.commit()
        elif admin_record[0] != 'admin':
            print("--- Updating existing user to Admin role ---")
            cursor.execute("UPDATE users SET role = 'admin' WHERE email = %s", ('admin@themobhub.com',))
            conn.commit()

        cursor.close(); conn.close()
        print("--- Database successfully initialized ---")
    except Exception as e:
        print(f"--- INIT ERROR: {e} ---")

init_db()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"}), 200

@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    if username in ['admin', 'admin@themobhub.com'] and password == 'admin123':
        return jsonify({
            "token": "admin-token-123",
            "user": {"id": 0, "name": "Admin", "email": "admin@themobhub.com", "role": "admin"}
        })
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    admin_emails = ['admin', 'admin@gmail.com', 'admin@themobhub.com']
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        if email in admin_emails and password == 'admin123':
            cursor.execute("SELECT * FROM users WHERE email = 'admin@themobhub.com'")
            user = cursor.fetchone()
            if user:
                return jsonify({"user": {"id": user['id'], "name": user['name'], "email": user['email'], "role": 'admin'}})
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close(); conn.close()
        if user and check_password_hash(user['password'], password):
            return jsonify({"user": {"id": user['id'], "name": user['name'], "email": user['email'], "role": user['role']}})
        return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e: return jsonify({"error": str(e)}), 500


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    try:
        hp = generate_password_hash(data['password'])
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email, password) VALUES (%s,%s,%s)", (data['name'], data['email'], hp))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Success"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/cars', methods=['GET'])
def get_cars():
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM cars WHERE 1=1"
        params = []
        if request.args.get('brand'): query += " AND brand = %s"; params.append(request.args.get('brand'))
        if request.args.get('max_price'): query += " AND price <= %s"; params.append(request.args.get('max_price'))
        if request.args.get('body_type'): query += " AND body_type = %s"; params.append(request.args.get('body_type'))
        if request.args.get('fuel_type'): query += " AND fuel_type = %s"; params.append(request.args.get('fuel_type'))
        cursor.execute(query, params)
        cars = cursor.fetchall()
        cursor.close(); conn.close()
        for car in cars: 
            car['image'] = car.get('image_url_front')
            if car.get('available_from'): car['available_from'] = str(car['available_from'])
            if car.get('available_until'): car['available_until'] = str(car['available_until'])
        return jsonify(cars)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/cars/<int:car_id>', methods=['GET'])
def get_car_details(car_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM cars WHERE id = %s", (car_id,))
        car = cursor.fetchone()
        cursor.close(); conn.close()
        if car: 
            car['image'] = car.get('image_url_front')
            if car.get('available_from'): car['available_from'] = str(car['available_from'])
            if car.get('available_until'): car['available_until'] = str(car['available_until'])
        return jsonify(car) if car else (jsonify({"error": "Not found"}), 404)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/market-insights', methods=['GET'])
def get_market_insights():
    price = float(request.args.get('price', 0))
    monthly_emi = (price * 0.085 / 12) + (price / 60)
    return jsonify({"estimated_monthly_emi": int(monthly_emi), "estimated_annual_maintenance": int(price * 0.02), "estimated_monthly_fuel": 8000, "resale_value_3yr": int(price * 0.65)})

@app.route('/api/rent', methods=['POST'])
def rent():
    try:
        if request.is_json:
            data = request.json
            files = {}
        else:
            data = request.form
            files = request.files

        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        
        # Availability Check
        cursor.execute("SELECT available_from, available_until FROM cars WHERE id = %s", (data['car_id'],))
        car = cursor.fetchone()
        if car and car['available_from'] and car['available_until']:
            req_pickup = datetime.strptime(data['pickup_date'], '%Y-%m-%d').date()
            req_return = datetime.strptime(data['return_date'], '%Y-%m-%d').date()
            if req_pickup < car['available_from'] or req_return > car['available_until']:
                cursor.close(); conn.close()
                return jsonify({"error": f"Vehicle is only available from {car['available_from']} to {car['available_until']}"}), 400

        # Overlap Check
        cursor.execute("""
            SELECT id FROM bookings 
            WHERE car_id = %s 
            AND status != 'Rejected'
            AND (%s <= return_date) AND (%s >= pickup_date)
        """, (data['car_id'], data['pickup_date'], data['return_date']))
        
        if cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"error": "This vehicle is already booked for the selected dates."}), 400

        # Handle File Uploads
        license_filename = None
        id_proof_filename = None

        if 'license' in files:
            file = files['license']
            if file.filename != '':
                license_filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], license_filename))
        
        if 'id_proof' in files:
            file = files['id_proof']
            if file.filename != '':
                id_proof_filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], id_proof_filename))

        # Insert Booking
        cursor.execute("""
            INSERT INTO bookings (
                user_name, car_id, pickup_date, pickup_time, return_date, return_time, 
                location, payment_method, license_path, id_proof_path, driver_option, coupon_code, driver_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data['user_name'], data['car_id'], data['pickup_date'], data.get('pickup_time', '09:00:00'),
            data['return_date'], data.get('return_time', '18:00:00'), data['location'], 
            data.get('payment_method', 'Pay at Pickup'), license_filename, id_proof_filename,
            data.get('driver_option', 'Self Drive'), data.get('coupon_code'), data.get('driver_id')
        ))
        
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Car has been booked successfully"}), 201
    except Exception as e: 
        print("RENT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/user-bookings/<string:user_name>', methods=['GET'])
def get_user_bookings(user_name):
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT b.*, COALESCE(c.brand, 'Unknown') as brand, COALESCE(c.model, 'Vehicle') as model, c.image_url_front, c.price_per_day FROM bookings b LEFT JOIN cars c ON b.car_id = c.id WHERE b.user_name = %s ORDER BY b.created_at DESC", (user_name,))
        bookings = cursor.fetchall()
        cursor.close(); conn.close()
        results = []
        for b in bookings:
            d1, d2 = b['pickup_date'], b['return_date']
            days = (d2 - d1).days or 1
            b['total_amount'] = days * (b['price_per_day'] or 0)
            b['pickup_date'] = str(b['pickup_date']); b['return_date'] = str(b['return_date']); b['created_at'] = str(b['created_at'])
            b['pickup_time'] = str(b['pickup_time']); b['return_time'] = str(b['return_time'])
            results.append(b)
        return jsonify(results)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/recommend-cars', methods=['POST'])
def recommend():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM cars"); all_cars = cursor.fetchall()
        scored = []
        for c in all_cars:
            score = 0
            if c['price_per_day'] <= float(data.get('budget', 100000)): score += 3
            if c['fuel_type'] == data.get('fuel_type'): score += 2
            if c['body_type'] == data.get('body_type'): score += 2
            c['ai_score'], c['match_reasons'] = score, []
            c['image'] = c.get('image_url_front')
            scored.append(c)
        scored.sort(key=lambda x: x['ai_score'], reverse=True)
        cursor.close(); conn.close()
        return jsonify(scored[:10])
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as total_cars FROM cars")
        c = cursor.fetchone()['total_cars']
        cursor.execute("SELECT COUNT(*) as total_bookings FROM bookings")
        b = cursor.fetchone()['total_bookings']
        cursor.execute("SELECT COUNT(*) as active_rentals FROM bookings WHERE status = 'Confirmed'")
        a = cursor.fetchone()['active_rentals']
        cursor.close(); conn.close()
        return jsonify({"total_cars": c, "total_bookings": b, "active_rentals": a})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/bookings', methods=['GET'])
def get_all_bookings():
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT b.*, c.brand, c.model, c.price_per_day, c.fuel_type FROM bookings b LEFT JOIN cars c ON b.car_id = c.id ORDER BY b.created_at DESC")
        rows = cursor.fetchall(); cursor.close(); conn.close()
        for r in rows: 
            r['pickup_date'] = str(r['pickup_date'])
            r['return_date'] = str(r['return_date'])
            r['created_at'] = str(r['created_at'])
            if r.get('pickup_time'): r['pickup_time'] = str(r['pickup_time'])
            if r.get('return_time'): r['return_time'] = str(r['return_time'])
        return jsonify(rows)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/delete-car/<int:car_id>', methods=['DELETE'])
def delete_car(car_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("DELETE FROM cars WHERE id = %s", (car_id,))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Deleted"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/update-car', methods=['PUT'])
def update_car():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("UPDATE cars SET brand=%s, model=%s, price=%s, price_per_day=%s, body_type=%s, fuel_type=%s, location=%s, seats=%s, available_from=%s, available_until=%s, features=%s, image_url_front=%s WHERE id=%s", 
                       (data['brand'], data['model'], data['price'], data['price_per_day'], data['body_type'], data['fuel_type'], data['location'], data.get('seats', 5), data.get('available_from'), data.get('available_until'), data.get('features', ''), data['image_url'], data['id']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Updated"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/add-car', methods=['POST'])
def add_car():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("INSERT INTO cars (brand, model, price, price_per_day, body_type, fuel_type, location, seats, available_from, available_until, features, image_url_front) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", 
                       (data['brand'], data['model'], data['price'], data['price_per_day'], data['body_type'], data['fuel_type'], data.get('location', 'Mumbai'), data.get('seats', 5), data.get('available_from'), data.get('available_until'), data.get('features', ''), data['image_url']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Success"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/update-booking-status', methods=['PUT'])
def update_booking_status():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (data['status'], data['booking_id']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Updated"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/create-payment', methods=['POST'])
def create_payment():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT b.*, c.price_per_day FROM bookings b JOIN cars c ON b.car_id = c.id WHERE b.id = %s", (data['booking_id'],))
        booking = cursor.fetchone()
        cursor.close(); conn.close()
        
        if not booking:
            return jsonify({"error": "Booking not found"}), 404

        days = (booking['return_date'] - booking['pickup_date']).days or 1
        base_amount = days * (booking['price_per_day'] or 0)
        
        # Calculate total amount (base + taxes + deposit)
        # Check if driver option selected
        if booking.get('driver_option') == 'driver':
            base_amount += (days * 1000)
            
        taxes = base_amount * 0.18
        deposit = 2000
        total_amount = base_amount + taxes + deposit
        
        # Razorpay expects amount in paise (multiply by 100)
        amount_in_paise = int(total_amount * 100)

        # Create Razorpay Order
        order_data = {
            'amount': amount_in_paise,
            'currency': 'INR',
            'receipt': f"receipt_booking_{booking['id']}",
            'notes': {
                'booking_id': booking['id'],
                'user_name': booking['user_name']
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Save payment as "Created"
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO payments (booking_id, razorpay_order_id, amount, status)
            VALUES (%s, %s, %s, 'Created')
        """, (booking['id'], razorpay_order['id'], total_amount))
        conn.commit(); cursor.close(); conn.close()

        return jsonify({
            "booking_id": booking['id'],
            "amount": total_amount,
            "razorpay_order_id": razorpay_order['id'],
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        })
    except Exception as e:
        print("CREATE PAYMENT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    data = request.json
    try:
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_signature = data.get('razorpay_signature')
        booking_id = data.get('booking_id')

        # Verify signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        try:
            razorpay_client.utility.verify_payment_signature(params_dict)
        except razorpay.errors.SignatureVerificationError:
            # Payment failed or signature invalid
            conn = get_db_connection(); cursor = conn.cursor()
            cursor.execute("UPDATE payments SET status = 'Failed' WHERE razorpay_order_id = %s", (razorpay_order_id,))
            conn.commit(); cursor.close(); conn.close()
            return jsonify({"error": "Payment verification failed"}), 400

        # Payment successful
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("""
            UPDATE payments 
            SET status = 'Success', razorpay_payment_id = %s, razorpay_signature = %s 
            WHERE razorpay_order_id = %s
        """, (razorpay_payment_id, razorpay_signature, razorpay_order_id))
        
        # Update booking
        cursor.execute("""
            UPDATE bookings 
            SET payment_status = 'Paid', payment_id = %s, status = 'Confirmed' 
            WHERE id = %s
        """, (razorpay_payment_id, booking_id))
        
        conn.commit(); cursor.close(); conn.close()
        
        return jsonify({"message": "Payment verified successfully!"})
    except Exception as e:
        print("VERIFY PAYMENT ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/compare', methods=['POST'])
def compare():
    ids = request.json.get('car_ids', [])
    if not ids: return jsonify([])
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        fs = ','.join(['%s'] * len(ids))
        cursor.execute(f"SELECT * FROM cars WHERE id IN ({fs})", tuple(ids))
        cars = cursor.fetchall(); cursor.close(); conn.close()
        for c in cars: c['image'] = c.get('image_url_front')
        return jsonify(cars)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("INSERT INTO messages (user_name, car_id, subject, message) VALUES (%s,%s,%s,%s)", 
                       (data['user_name'], data.get('car_id'), data['subject'], data['message']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Query sent successfully!"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/messages', methods=['GET'])
def get_admin_messages():
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT m.*, c.brand, c.model FROM messages m LEFT JOIN cars c ON m.car_id = c.id ORDER BY m.created_at DESC")
        rows = cursor.fetchall(); cursor.close(); conn.close()
        for r in rows: r['created_at'] = str(r['created_at'])
        return jsonify(rows)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/update-message-status', methods=['PUT'])
def update_message_status():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("UPDATE messages SET status = %s WHERE id = %s", (data['status'], data['message_id']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Updated"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/delete-booking/<int:booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Deleted"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/delete-message/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE id = %s", (msg_id,))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Deleted"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/reply-message', methods=['POST'])
def reply_message():
    data = request.json
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("UPDATE messages SET reply_text = %s, status = 'Replied', replied_at = CURRENT_TIMESTAMP WHERE id = %s", 
                       (data['reply_text'], data['message_id']))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Reply sent successfully!"})
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/user-messages/<string:user_name>', methods=['GET'])
def get_user_messages(user_name):
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT m.*, c.brand, c.model FROM messages m LEFT JOIN cars c ON m.car_id = c.id WHERE m.user_name = %s ORDER BY m.created_at DESC", (user_name,))
        rows = cursor.fetchall(); cursor.close(); conn.close()
        for r in rows: 
            r['created_at'] = str(r['created_at'])
            if r.get('replied_at'): r['replied_at'] = str(r['replied_at'])
        return jsonify(rows)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/car-booked-dates/<int:car_id>', methods=['GET'])
def get_car_booked_dates(car_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT pickup_date, return_date FROM bookings WHERE car_id = %s AND status IN ('Pending', 'Approved', 'Confirmed')", (car_id,))
        rows = cursor.fetchall()
        for r in rows:
            if r.get('pickup_date'): r['pickup_date'] = str(r['pickup_date'])
            if r.get('return_date'): r['return_date'] = str(r['return_date'])
        cursor.close(); conn.close()
        return jsonify(rows)
    except Exception as e: return jsonify({"error": str(e)}), 500

# --- DRIVER ENDPOINTS ---

@app.route('/api/drivers', methods=['GET'])
def get_drivers():
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM drivers ORDER BY created_at DESC")
        drivers = cursor.fetchall()
        cursor.close(); conn.close()
        for d in drivers: d['created_at'] = str(d['created_at'])
        return jsonify(drivers)
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/add-driver', methods=['POST'])
def add_driver():
    try:
        if request.is_json:
            data = request.json
            files = {}
        else:
            data = request.form
            files = request.files

        image_url = data.get('image_url')
        if 'image' in files:
            file = files['image']
            if file.filename != '':
                filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                image_url = f"{request.host_url}api/uploads/{filename}"

        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO drivers (name, license_no, experience, phone, image_url, status, languages, rating) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (data.get('name'), data.get('license_no'), data.get('experience'), data.get('phone'), image_url, data.get('status', 'Available'), data.get('languages', ''), int(data.get('rating', 5))))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Driver added successfully"}), 201
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/admin/delete-driver/<int:driver_id>', methods=['DELETE'])
def delete_driver(driver_id):
    try:
        conn = get_db_connection(); cursor = conn.cursor()
        cursor.execute("DELETE FROM drivers WHERE id = %s", (driver_id,))
        conn.commit(); cursor.close(); conn.close()
        return jsonify({"message": "Driver deleted successfully"})
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
