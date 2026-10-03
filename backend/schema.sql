-- ========================================================
-- Car Recommendation & Rental System Database Schema
-- Database Name: car_recommendation
-- ========================================================

CREATE DATABASE IF NOT EXISTS `car_recommendation` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `car_recommendation`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'user',
    `preferences` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Cars Table
CREATE TABLE IF NOT EXISTS `cars` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `brand` VARCHAR(50) NOT NULL,
    `model` VARCHAR(50) NOT NULL,
    `price` INT NOT NULL,
    `price_per_day` INT DEFAULT 5000,
    `body_type` VARCHAR(50) NOT NULL,
    `fuel_type` VARCHAR(20),
    `location` VARCHAR(50),
    `mileage` VARCHAR(50),
    `engine` VARCHAR(50),
    `power` INT,
    `transmission` VARCHAR(20),
    `safety_rating` INT DEFAULT 5,
    `suitability_city` INT DEFAULT 3,
    `suitability_long_drive` INT DEFAULT 4,
    `suitability_family` INT DEFAULT 4,
    `pros` TEXT,
    `cons` TEXT,
    `image_url_front` VARCHAR(255),
    `image_url_rear` VARCHAR(255),
    `image_url_side` VARCHAR(255),
    `image_url_interior` VARCHAR(255),
    `description` TEXT,
    `seats` INT DEFAULT 5,
    `available_dates` VARCHAR(255) DEFAULT 'All days',
    `available_from` DATE,
    `available_until` DATE,
    `features` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Drivers Table
CREATE TABLE IF NOT EXISTS `drivers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `license_no` VARCHAR(50),
    `experience` VARCHAR(50),
    `phone` VARCHAR(20),
    `image_url` VARCHAR(255),
    `status` ENUM('Available', 'On Trip', 'Unavailable') DEFAULT 'Available',
    `languages` VARCHAR(255),
    `rating` INT DEFAULT 5,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS `bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_name` VARCHAR(100) NOT NULL,
    `car_id` INT NOT NULL,
    `pickup_date` DATE NOT NULL,
    `pickup_time` TIME DEFAULT '09:00:00',
    `return_date` DATE NOT NULL,
    `return_time` TIME DEFAULT '18:00:00',
    `location` VARCHAR(255) NOT NULL,
    `payment_method` VARCHAR(50),
    `payment_status` ENUM('Pending', 'Paid') DEFAULT 'Pending',
    `payment_id` VARCHAR(100),
    `status` ENUM('Pending', 'Approved', 'Rejected', 'Confirmed') DEFAULT 'Pending',
    `license_path` VARCHAR(255),
    `id_proof_path` VARCHAR(255),
    `driver_option` VARCHAR(50) DEFAULT 'Self Drive',
    `coupon_code` VARCHAR(50),
    `driver_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_name` VARCHAR(100) NOT NULL,
    `car_id` INT,
    `subject` VARCHAR(255),
    `message` TEXT NOT NULL,
    `reply_text` TEXT,
    `status` ENUM('New', 'Read', 'Replied') DEFAULT 'New',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `replied_at` TIMESTAMP NULL,
    FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT,
    `razorpay_order_id` VARCHAR(100),
    `razorpay_payment_id` VARCHAR(100),
    `razorpay_signature` VARCHAR(255),
    `amount` INT,
    `currency` VARCHAR(10) DEFAULT 'INR',
    `method` VARCHAR(50),
    `status` ENUM('Created', 'Success', 'Failed') DEFAULT 'Created',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Wishlist Table
CREATE TABLE IF NOT EXISTS `wishlist` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `car_id` INT,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `user_car_unique` (`user_id`, `car_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Search History Table
CREATE TABLE IF NOT EXISTS `search_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `search_query` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- Seed Initial Rental Fleet Data
-- ========================================================

INSERT INTO `cars` (`brand`, `model`, `price`, `price_per_day`, `body_type`, `fuel_type`, `location`, `mileage`, `engine`, `power`, `transmission`, `safety_rating`, `description`, `pros`, `cons`, `image_url_front`) VALUES
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
ON DUPLICATE KEY UPDATE `brand` = VALUES(`brand`);
