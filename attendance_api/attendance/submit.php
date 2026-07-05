<?php

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
    echo json_encode(["status" => "error", "message" => "No input data received"]);
    exit;
}

$fingerprint_id = $data['fingerprint_id'] ?? null;
$device_id = $data['device_id'] ?? null;

if (!$fingerprint_id || !$device_id) {
    writeLog(
        $conn,
        $device_id ?? 'UNKNOWN',
        $fingerprint_id ?? 0,
        null,
        'invalid_request',
        'Missing fingerprint_id or device_id'
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Missing fingerprint_id or device_id"
    ]);
    exit;
}

/* -----------------------------
   1. Find Student
----------------------------- */
$studentQuery = "SELECT student_id, name, nim FROM students WHERE fingerprint_id = '$fingerprint_id'";
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
$student_name = $student['name'];

/* -----------------------------
   2. Find Active Schedule for this Device
----------------------------- */
$today = date("l");
$currentTime = date("H:i:s");

$scheduleQuery = "
SELECT 
    cs.schedule_id, 
    cs.class_id, 
    cs.start_time, 
    cs.end_time,
    cs.grace_period,
    c.class_name,
    c.class_code
FROM class_schedules cs
JOIN classes c ON cs.class_id = c.class_id
WHERE cs.device_id = '$device_id'
AND cs.day_of_week = '$today'
AND '$currentTime' BETWEEN cs.start_time AND cs.end_time
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
$schedule_id = $schedule['schedule_id'];
$class_id = $schedule['class_id'];
$class_name = $schedule['class_name'];
$schedule_start = $schedule['start_time'];
$grace_period = $schedule['grace_period'] ?? 15;

/* -----------------------------
   3. ✅ Check if Student is ASSIGNED to this Schedule
   (This is the ONLY check you need)
----------------------------- */
$assignmentQuery = "
SELECT id 
FROM schedule_students 
WHERE schedule_id = '$schedule_id' 
AND student_id = '$student_id'
";

$assignmentResult = mysqli_query($conn, $assignmentQuery);

if (!$assignmentResult || mysqli_num_rows($assignmentResult) === 0) {
    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'not_assigned_to_schedule',
        "Student $student_name (ID: $student_id) not assigned to schedule $schedule_id"
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Student not enrolled in this class session"
    ]);
    exit;
}

/* -----------------------------
   4. Late Detection
----------------------------- */
$dateToday = date("Y-m-d");
$timezone = new DateTimeZone('Asia/Jakarta');
$now = new DateTime('now', $timezone);
$nowTime = $now->format('H:i:s');

$startDateTime = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', "$dateToday $schedule_start", $timezone);
$graceMinutes = max(0, intval($grace_period));
$lateThreshold = $startDateTime->modify("+$graceMinutes minutes");
$timestamp = $now->format('Y-m-d H:i:s');

if ($now > $lateThreshold) {
    $attendance_status = 'Late';
} else {
    $attendance_status = 'Present';
}

writeLog(
    $conn,
    $device_id,
    $fingerprint_id,
    $student_id,
    $attendance_status === 'Late' ? 'late_arrival' : 'attendance_check',
    "Arrived at $nowTime, class started at $schedule_start (Grace: $graceMinutes min)"
);

/* -----------------------------
   5. Check for Existing Attendance
----------------------------- */
$duplicateQuery = "
SELECT attendance_id, status
FROM attendance
WHERE student_id = '$student_id'
AND schedule_id = '$schedule_id'
AND DATE(timestamp) = '$dateToday'
LIMIT 1
";

$duplicateResult = mysqli_query($conn, $duplicateQuery);

if ($duplicateResult && mysqli_num_rows($duplicateResult) > 0) {
    $existingAttendance = mysqli_fetch_assoc($duplicateResult);
    $existingAttendanceId = $existingAttendance['attendance_id'];
    $existingStatus = $existingAttendance['status'];

    if ($existingStatus === 'Late' && $attendance_status === 'Present') {
        $updateQuery = "
        UPDATE attendance
        SET status = '$attendance_status', timestamp = '$timestamp', sync_status = 'synced'
        WHERE attendance_id = '$existingAttendanceId'
        ";

        if (mysqli_query($conn, $updateQuery)) {
            writeLog(
                $conn,
                $device_id,
                $fingerprint_id,
                $student_id,
                'attendance_updated',
                "Updated existing attendance to $attendance_status based on current grace period"
            );

            echo json_encode([
                "status" => "success",
                "message" => "Attendance recorded as " . $attendance_status,
                "student_name" => $student_name,
                "class_name" => $class_name
            ]);
            exit;
        }
    }

    writeLog(
        $conn,
        $device_id,
        $fingerprint_id,
        $student_id,
        'duplicate_attendance',
        "Already attended schedule $schedule_id today"
    );

    echo json_encode([
        "status" => "rejected",
        "message" => "Attendance already recorded for this session"
    ]);
    exit;
}

/* -----------------------------
   6. Store Attendance
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
        "message" => "Attendance recorded as " . $attendance_status,
        "student_name" => $student_name,
        "class_name" => $class_name
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