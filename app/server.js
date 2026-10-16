const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'hrm_user',
  password: process.env.DB_PASSWORD || 'secretpassword',
  database: process.env.DB_NAME || 'hrm_db',
  port: 5432,
});

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'hrm_http_requests_total',
  help: 'Tổng số HTTP request vào hệ thống HRM',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'ERROR' : 'INFO',
      service: 'hrm-app',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ip: req.ip
    }));
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.get('/', async (req, res) => {
  try {
    const depts = await pool.query('SELECT * FROM departments ORDER BY id');
    const emps = await pool.query(`
      SELECT e.*, d.name as dept_name 
      FROM employees e LEFT JOIN departments d ON e.department_id = d.id 
      ORDER BY e.id
    `);
    const att = await pool.query(`
      SELECT a.*, e.employee_code, e.full_name 
      FROM attendance a JOIN employees e ON a.employee_id = e.id 
      ORDER BY a.work_date DESC, a.check_in DESC
    `);

    let html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hệ thống Quản lý Nhân sự (HRM)</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light p-4">
      <div class="container">
        <h2 class="text-primary mb-4 fw-bold">🏢 HỆ THỐNG QUẢN LÝ NHÂN SỰ & CHẤM CÔNG (HRM)</h2>
        
        <div class="row mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm">
              <div class="card-header bg-primary text-white fw-bold">Thêm Nhân Viên Mới</div>
              <div class="card-body">
                <form action="/employees" method="POST">
                  <div class="mb-2"><input name="employee_code" class="form-control" placeholder="Mã NV (VD: NV004)" required></div>
                  <div class="mb-2"><input name="full_name" class="form-control" placeholder="Họ và tên" required></div>
                  <div class="mb-2"><input name="email" type="email" class="form-control" placeholder="Email" required></div>
<div class="mb-2"><input name="position" class="form-control" placeholder="Chức vụ (VD: Tester)" required></div>
                  <div class="mb-2">
                    <select name="department_id" class="form-select">
                      ${depts.rows.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                    </select>
                  </div>
                  <button class="btn btn-success w-100">Lưu Nhân Viên</button>
                </form>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card shadow-sm">
              <div class="card-header bg-warning text-dark fw-bold">Chấm Công Nhanh</div>
              <div class="card-body">
                <form action="/attendance" method="POST">
                  <div class="mb-3">
                    <label class="form-label">Chọn nhân viên:</label>
                    <select name="employee_id" class="form-select">
                      ${emps.rows.map(e => `<option value="${e.id}">${e.employee_code} -${e.full_name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Hành động:</label>
                    <select name="action" class="form-select">
                      <option value="checkin">Check-in (Vào ca)</option>
                      <option value="checkout">Check-out (Tan ca)</option>
                    </select>
                  </div>
                  <button class="btn btn-primary w-100">Xác Nhận Chấm Công</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mb-4">
          <div class="card-header bg-dark text-white fw-bold">Danh Sách Nhân Viên</div>
          <div class="card-body p-0">
            <table class="table table-striped mb-0">
              <thead><tr><th>Mã NV</th><th>Họ Tên</th><th>Email</th><th>Chức Vụ</th><th>Phòng Ban</th></tr></thead>
              <tbody>
                ${emps.rows.map(e => `<tr><td><b>${e.employee_code}</b></td><td>${e.full_name}</td><td>${e.email}</td><td>${e.position}</td><td><span class="badge bg-info text-dark">${e.dept_name ? e.dept_name : ''}</span></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-header bg-secondary text-white fw-bold">Lịch Sử Chấm Công</div>
          <div class="card-body p-0">
            <table class="table table-bordered mb-0">
              <thead><tr><th>Ngày</th><th>Mã NV</th><th>Họ Tên</th><th>Giờ Vào</th><th>Giờ Ra</th><th>Trạng Thái</th></tr></thead>
              <tbody>
${att.rows.map(a => `<tr><td>${new Date(a.work_date).toLocaleDateString('vi-VN')}</td><td>${a.employee_code}</td><td>${a.full_name}</td><td>${a.check_in ? a.check_in : '-'}</td><td>${a.check_out ? a.check_out : '-'}</td><td><span class="badge ${a.status === 'PRESENT' ? 'bg-success' : 'bg-danger'}">${a.status}</span></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>`;
    res.send(html);
  } catch (err) {
    console.error(JSON.stringify({ level: 'ERROR', msg: err.message }));
    res.status(500).send('Lỗi kết nối CSDL: ' + err.message);
  }
});

app.post('/employees', async (req, res) => {
  const { employee_code, full_name, email, position, department_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO employees (employee_code, full_name, email, position, department_id) VALUES ($1, $2, $3, $4, $5)',
      [employee_code, full_name, email, position, department_id]
    );
    res.redirect('/');
  } catch (err) {
    console.error(JSON.stringify({ level: 'ERROR', msg: err.message }));
    res.status(400).send('Lỗi thêm nhân viên: ' + err.message);
  }
});

app.post('/attendance', async (req, res) => {
  const { employee_id, action } = req.body;
  try {
    if (action === 'checkin') {
      await pool.query(`
        INSERT INTO attendance (employee_id, work_date, check_in, status)
        VALUES ($1, CURRENT_DATE, CURRENT_TIME, CASE WHEN CURRENT_TIME > '08:05:00' THEN 'LATE' ELSE 'PRESENT' END)
        ON CONFLICT (employee_id, work_date) DO NOTHING
      `, [employee_id]);
    } else {
      await pool.query(`
        UPDATE attendance SET check_out = CURRENT_TIME WHERE employee_id = $1 AND work_date = CURRENT_DATE
      `, [employee_id]);
    }
    res.redirect('/');
  } catch (err) {
    console.error(JSON.stringify({ level: 'ERROR', msg: err.message }));
    res.status(400).send('Lỗi chấm công: ' + err.message);
  }
});

app.listen(3000, () => {
  console.log(JSON.stringify({ level: 'INFO', msg: 'HRM Server running on port 3000' }));
});
