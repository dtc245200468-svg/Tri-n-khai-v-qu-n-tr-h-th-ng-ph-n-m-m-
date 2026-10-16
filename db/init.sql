CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    position VARCHAR(50),
    department_id INT REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME DEFAULT CURRENT_TIME,
    check_out TIME,
    status VARCHAR(20) DEFAULT 'PRESENT',
    CONSTRAINT unique_emp_date UNIQUE (employee_id, work_date)
);

INSERT INTO departments (name, description) VALUES 
('Phòng Kỹ thuật (IT)', 'Phát triển phần mềm và vận hành hệ thống'),
('Phòng Nhân sự (HR)', 'Tuyển dụng và quản lý nhân sự'),
('Phòng Kinh doanh (Sales)', 'Phát triển thị trường')
ON CONFLICT (name) DO NOTHING;

INSERT INTO employees (employee_code, full_name, email, position, department_id) VALUES 
('NV001', 'Nguyễn Văn An', 'an.nv@hrm.local', 'Backend Developer', 1),
('NV002', 'Trần Thị Bình', 'binh.tt@hrm.local', 'HR Specialist', 2),
('NV003', 'Lê Hoàng Cường', 'cuong.lh@hrm.local', 'DevOps Engineer', 1)
ON CONFLICT (employee_code) DO NOTHING;
