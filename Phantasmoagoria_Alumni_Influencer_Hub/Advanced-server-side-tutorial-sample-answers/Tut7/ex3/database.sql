-- Create course table
CREATE TABLE courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    course_name VARCHAR(100) NOT NULL,
    instructor_name VARCHAR(100) NOT NULL,
    credit_value INT NOT NULL,
    department VARCHAR(100) NOT NULL
);

-- Insert sample data into course table
INSERT INTO courses (course_name, instructor_name, credit_value, department)
VALUES
('Database Systems', 'Dr. Perera', 3, 'Computer Science'),
('Software Engineering', 'Prof. Silva', 4, 'Computer Science'),
('Data Structures', 'Dr. Fernando', 3, 'Computer Science'),
('Business Management', 'Mr. Jayasinghe', 2, 'Business'),
('Electrical Circuits', 'Dr. Wijesinghe', 3, 'Engineering');

-- Create api_keys table

CREATE TABLE api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample API keys
INSERT INTO api_keys (api_key) VALUES ('12345');