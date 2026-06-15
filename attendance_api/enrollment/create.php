<?php

header("Content-Type: application/json");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$student_id = $data['student_id'] ?? null;
$device_id = $data['device_id'] ?? null;

if (!$student_id || !$device_id) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing student_id or device_id"
    ]);
    exit;
}

/* -----------------------------
   1. Validate student
----------------------------- */
$studentCheckQuery = "
SELECT fingerprint_id
FROM students
WHERE student_id = '$student_id'
";

$studentCheckResult = $conn->query($studentCheckQuery);

if ($studentCheckResult->num_rows === 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Student not found"
    ]);
    exit;
}

$student = $studentCheckResult->fetch_assoc();

if (!is_null($student['fingerprint_id'])) {
    echo json_encode([
        "status" => "rejected",
        "message" => "Student already enrolled"
    ]);
    exit;
}

/* -----------------------------
   2. Check duplicate request
----------------------------- */
$checkQuery = "
SELECT request_id
FROM enrollment_requests
WHERE student_id = '$student_id'
AND status IN ('pending', 'processing')
";

$checkResult = $conn->query($checkQuery);

if ($checkResult->num_rows > 0) {
    echo json_encode([
        "status" => "rejected",
        "message" => "Enrollment already pending"
    ]);
    exit;
}

/* -----------------------------
   3. Find next slot
----------------------------- */
$slotQuery = "
SELECT COALESCE(MAX(fingerprint_id), 0) + 1 AS next_slot
FROM students
";

$slotResult = $conn->query($slotQuery);
$slot = $slotResult->fetch_assoc()['next_slot'];

/* -----------------------------
   4. Create request
----------------------------- */
$query = "
INSERT INTO enrollment_requests
(student_id, device_id, fingerprint_slot)
VALUES
('$student_id', '$device_id', '$slot')
";

if ($conn->query($query)) {
    echo json_encode([
        "status" => "success",
        "fingerprint_slot" => $slot,
        "message" => "Enrollment request created"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to create enrollment request"
    ]);
}

$conn->close();

?>