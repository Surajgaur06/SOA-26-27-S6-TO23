import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["username"] == "admin"

def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_unauthenticated_access_rejected():
    response = client.get("/api/v1/loggers")
    assert response.status_code == 401

def test_authenticated_logger_listing():
    # Login as admin
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # List loggers
    res = client.get("/api/v1/loggers", headers=headers)
    assert res.status_code == 200
    loggers = res.json()
    assert len(loggers) >= 10
    assert any(l["logger_id"] == "TL-001" for l in loggers)

def test_prevent_duplicate_logger_id():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try duplicate logger_id TL-001
    dup_payload = {
        "logger_id": "TL-001",
        "manufacturer": "Test",
        "model": "TestModel",
        "serial_number": "UNIQUE-SN-9999",
        "logger_type": "USB",
        "measurement_range": "-20 to 50",
        "accuracy_spec": "±0.5",
        "location": "Lab",
        "owner": "Owner",
        "commissioning_date": "2026-01-01T00:00:00Z"
    }
    res = client.post("/api/v1/loggers", json=dup_payload, headers=headers)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]

def test_dashboard_metrics():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get("/api/v1/dashboard/metrics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_loggers"] >= 10
    assert "status_distribution" in data
    assert "activity_timeline" in data

def test_pdf_report_download():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch first calibration record
    cals = client.get("/api/v1/calibrations", headers=headers).json()
    first_id = cals[0]["id"]
    
    # Download PDF
    pdf_res = client.get(f"/api/v1/calibrations/{first_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000 # Valid generated PDF file
