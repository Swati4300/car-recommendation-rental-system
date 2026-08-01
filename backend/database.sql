CREATE DATABASE IF NOT EXISTS car_recommendation;
USE car_recommendation;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cars Table
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    price_per_day INT DEFAULT 5000,
    body_type VARCHAR(50) NOT NULL,
    fuel_type VARCHAR(20),
    location VARCHAR(50), -- Added for location-based recommendation
    mileage VARCHAR(50),
    engine VARCHAR(50),
    power INT,
    torque INT,
    transmission VARCHAR(20),
    category VARCHAR(50),
    safety_rating INT,
    maintenance_cost_annual INT,
    resale_value_estimated INT,
    image_url_front VARCHAR(255),
    image_url_rear VARCHAR(255),
    image_url_side VARCHAR(255),
    image_url_interior VARCHAR(255),
    description TEXT,
    pros TEXT,
    cons TEXT,
    suitability_city INT,
    suitability_long_drive INT,
    suitability_family INT,
    is_featured BOOLEAN DEFAULT FALSE
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    car_id INT NOT NULL,
    pickup_date DATE NOT NULL,
    return_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
);

-- Wishlist Table
CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    car_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    UNIQUE(user_id, car_id)
);

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    search_query JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Curated Rental Fleet (10 Cars - Localized in Indian Cities)
DELETE FROM cars;
INSERT INTO cars (brand, model, price, price_per_day, body_type, fuel_type, location, mileage, transmission, safety_rating, image_url_front, description) VALUES
('Lamborghini', 'Huracan', 35000000, 85000, 'Sport', 'Petrol', 'Mumbai', '12 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80', 'Experience the thrill of a V10 supercar on Mumbai roads.'),
('Tesla', 'Model X', 12000000, 25000, 'SUV', 'Electric', 'Delhi', '450 km', 'Automatic', 5, 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?auto=format&fit=crop&w=800&q=80', 'The futuristic electric SUV, now available in the capital.'),
('Mercedes-Benz', 'G-Class', 25500000, 45000, 'SUV', 'Petrol', 'Mumbai', '8 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80', 'The ultimate luxury off-roader for the elite of Mumbai.'),
('Audi', 'R8 Spyder', 27200000, 75000, 'Convertible', 'Petrol', 'Bangalore', '10 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80', 'German precision meets open-top freedom in Bangalore.'),
('Porsche', '911 Carrera', 18500000, 55000, 'Sport', 'Petrol', 'Hyderabad', '14 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80', 'The benchmark for sports cars, now in Hyderabad.'),
('Range Rover', 'Sport', 16500000, 32000, 'SUV', 'Hybrid', 'Bangalore', '15 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1563720223185-11003d516905?auto=format&fit=crop&w=800&q=80', 'Luxury and capability redefined for the garden city.'),
('Ford', 'Mustang GT', 7500000, 18000, 'Coupe', 'Petrol', 'Delhi', '12 kmpl', 'Manual', 5, 'https://images.unsplash.com/photo-1584345604482-81167ff8e333?auto=format&fit=crop&w=800&q=80', 'The American icon. Pure V8 muscle for the capital\'s roads.'),
('BMW', 'M4 Competition', 14500000, 35000, 'Coupe', 'Petrol', 'Hyderabad', '13 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=800&q=80', 'Track-bred performance in a sophisticated package in Hyderabad.'),
('Rolls-Royce', 'Ghost', 69500000, 150000, 'Luxury', 'Petrol', 'Mumbai', '9 kmpl', 'Automatic', 5, 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80', 'The pinnacle of luxury for Mumbai\'s most prestigious travelers.'),
('Jeep', 'Wrangler Rubicon', 6500000, 15000, 'SUV', 'Petrol', 'Pune', '12 kmpl', 'Automatic', 4, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', 'The go-anywhere adventurer, perfect for escaping Pune.');
