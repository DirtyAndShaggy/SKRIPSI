<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

include("../config/database.php");

// ─── DEBUG: Log raw input ───
$raw_input = file_get_contents("php://input");
error_log("Latency API raw input: " . $raw_input);

// ─── GET data from POST or GET ───
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode($raw_input, true);
} else {
    // If GET request, use query parameters
    $data = $_GET;
}

// ─── If no data, try reading from POST directly ───
if (!$data) {
    // Try to get from $_POST (form data)
    $data = $_POST;
}

if (!$data || empty($data)) {
    echo json_encode([
        "status" => "error", 
        "message" => "No data received. Raw input: " . $raw_input,
        "method" => $_SERVER['REQUEST_METHOD']
    ]);
    exit;
}

$fingerprint_id = $data['fingerprint_id'] ?? null;
$device_id = $data['device_id'] ?? 'ESP32_01';
$status = $data['status'] ?? 'Unknown';
$total_latency = $data['total_latency'] ?? null;
$scan_duration = $data['scan_duration'] ?? null;
$api_duration = $data['api_duration'] ?? null;
$lcd_duration = $data['lcd_duration'] ?? null;
$http_code = $data['http_code'] ?? null;

// Find student_id from fingerprint_id
$student_id = null;
if ($fingerprint_id) {
    $studentQuery = "SELECT student_id FROM students WHERE fingerprint_id = '$fingerprint_id'";
    $studentResult = mysqli_query($conn, $studentQuery);
    if ($studentResult && mysqli_num_rows($studentResult) > 0) {
        $student = mysqli_fetch_assoc($studentResult);
        $student_id = $student['student_id'];
    }
}

// Build the log message with latency details
$message = "Status: $status, Total: ${total_latency}ms";
if ($scan_duration !== null) {
    $message .= ", Scan: ${scan_duration}ms";
}
if ($api_duration !== null) {
    $message .= ", API: ${api_duration}ms";
}
if ($lcd_duration !== null) {
    $message .= ", LCD: ${lcd_duration}ms";
}
if ($http_code !== null) {
    $message .= ", HTTP: $http_code";
}

// Insert into attendance_logs with latency data
$query = "INSERT INTO attendance_logs (
    device_id, 
    fingerprint_id, 
    student_id, 
    event_type, 
    message, 
    total_latency, 
    scan_duration, 
    api_duration, 
    lcd_duration, 
    http_code
) VALUES (
    '$device_id',
    '$fingerprint_id',
    " . ($student_id ? "'$student_id'" : "NULL") . ",
    'latency_measurement',
    '$message',
    " . ($total_latency !== null ? "'$total_latency'" : "NULL") . ",
    " . ($scan_duration !== null ? "'$scan_duration'" : "NULL") . ",
    " . ($api_duration !== null ? "'$api_duration'" : "NULL") . ",
    " . ($lcd_duration !== null ? "'$lcd_duration'" : "NULL") . ",
    " . ($http_code !== null ? "'$http_code'" : "NULL") . "
)";

if (mysqli_query($conn, $query)) {
    echo json_encode([
        "status" => "success",
        "message" => "Latency data saved",
        "log_id" => mysqli_insert_id($conn)
    ]);
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "Failed to save latency data: " . mysqli_error($conn)
    ]);
}

mysqli_close($conn);
?>