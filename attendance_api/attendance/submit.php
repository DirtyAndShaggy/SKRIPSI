<?php
include("../cors_headers.php");
include("../config/database.php");
header("Content-Type: application/json");
date_default_timezone_set('Asia/Jakarta');
include("../config/database.php");

/* -----------------------------
   Attendance Log Helper
----------------------------- */
function writeLog($conn, $device_id, $fingerprint_id, $student_id, $event_type, $message) {
    $device_id = mysqli_real_escape_string($conn, $device_id);
    $fingerprint_id = mysqli_real_escape_string($conn, $fingerprint_id);
    $event_type = mysqli_real_escape_string($conn, $event_type);
    $message = mysqli_real_escape_string($conn, $message);
    
    $student_id_value = is_null($student_id) ? "NULL" : "'" . mysqli_real_escape_string($conn, $student_id) . "'";

    $logQuery = "
    INSERT INTO attendance_logs
    (device_id, fingerprint_id, student_id, event_type, message)
    VALUES
    ('$device_id', '$fingerprint_id', $student_id_value, '$event_type', '$message')
    ";
    
    mysqli_query($conn, $logQuery);
}

/* -----------------------------
   Read Request Data
----------------------------- */
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode([
        "status" => "error",
        "message" => "No input data received"
    ]);
    exit;
}

$fingerprint_id = $data['fingerprint_id'] ?? null;
$device_id = $data['device_id'] ?? null;

if (!$fingerprint_id || !$device_id) {
    if (isset($conn)) {
        writeLog(
            $conn,
            $device_id ?? 'UNKNOWN',
            $fingerprint_id ?? 0,
            null,
            'invalid_request',
            'Missing fingerprint_id or device_id'
        );
    }

    echo json_encode([
        "status" => "error",
        "message" => "Missing fingerprint_id or device_id"
    ]);
    exit;
}

/* -----------------------------
   1. Find Student
----------------------------- */
$studentQuery = "SELECT student_id, name FROM students WHERE fingerprint_id = '$fingerprint_id'";
$studentResult = mysqli_query($conn, $studentQuery);

if (!$studentResult || mysqli_num_rows($studentResult) === 0) {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        null,
        'unknown_fingerprint',
        'Fingerprint not registered'
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Fingerprint not registered"
    ]);
    exit;
}

$student = mysqli_fetch_assoc($studentResult);
$student_id = $student['student_id'];

/* -----------------------------
   2. Find Active Schedule
----------------------------- */
$today = date("l");
$currentTime = date("H:i:s");

$scheduleQuery = "
SELECT class_id, schedule_id, start_time, end_time
FROM class_schedules
WHERE device_id = '$device_id'
AND day_of_week = '$today'
AND '$currentTime' BETWEEN start_time AND end_time
LIMIT 1
";

$scheduleResult = mysqli_query($conn, $scheduleQuery);

if (!$scheduleResult || mysqli_num_rows($scheduleResult) === 0) {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'no_schedule',
        "No active class schedule for $today at $currentTime"
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "No active class schedule"
    ]);
    exit;
}

$schedule = mysqli_fetch_assoc($scheduleResult);
$class_id = $schedule['class_id'];
$schedule_id = $schedule['schedule_id'];
$schedule_start = $schedule['start_time'];

/* -----------------------------
   3. Validate Enrollment (Active only)
----------------------------- */
$enrollmentQuery = "
SELECT id
FROM student_classes
WHERE student_id = '$student_id'
AND class_id = '$class_id'
AND (is_active = 1 OR is_active IS NULL)
";

$enrollmentResult = mysqli_query($conn, $enrollmentQuery);

if (!$enrollmentResult || mysqli_num_rows($enrollmentResult) === 0) {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'not_enrolled',
        "Student not enrolled in this class"
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Student not enrolled in this class"
    ]);
    exit;
}

/* -----------------------------
   4. Duplicate Prevention (Check specific session)
----------------------------- */
$dateToday = date("Y-m-d");

$duplicateQuery = "
SELECT attendance_id
FROM attendance
WHERE student_id = '$student_id'
AND schedule_id = '$schedule_id'
AND DATE(timestamp) = '$dateToday'
";

$duplicateResult = mysqli_query($conn, $duplicateQuery);

if ($duplicateResult && mysqli_num_rows($duplicateResult) > 0) {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'duplicate_attendance',
        "Already attended this session (Schedule ID: $schedule_id)"
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Already checked in for this session"
    ]);
    exit;
}

/* -----------------------------
   4.5 Late Detection
----------------------------- */
$grace_minutes = 15; // Configurable grace period
$late_threshold = date("H:i:s", strtotime("$schedule_start + $grace_minutes minutes"));

if ($currentTime > $late_threshold) {
    $attendance_status = 'Late';
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'late_arrival',
        "Arrived at $currentTime, class started at $schedule_start"
    );
} else {
    $attendance_status = 'Present';
}

/* -----------------------------
   5. Store Attendance
----------------------------- */
$timestamp = date("Y-m-d H:i:s");

$insertQuery = "
INSERT INTO attendance
(student_id, class_id, schedule_id, device_id, timestamp, status, sync_status)
VALUES
('$student_id', '$class_id', '$schedule_id', '$device_id', '$timestamp', '$attendance_status', 'synced')
";

if (mysqli_query($conn, $insertQuery)) {
    $attendance_id = mysqli_insert_id($conn);
    
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'attendance_success',
        "Attendance recorded. Record ID: $attendance_id, Status: $attendance_status"
    );

    echo json_encode([
        "status" => "success",
        "message" => "Attendance recorded as " . $attendance_status
    ]);

} else {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'database_error',
        'Failed to insert attendance: ' . mysqli_error($conn)
    );

    echo json_encode([
        "status" => "error",
        "message" => "Database insert failed"
    ]);
}

mysqli_close($conn);

?>