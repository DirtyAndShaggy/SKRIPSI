<?php
include("../cors_headers.php");
include("../config/database.php");
header("Content-Type: application/json");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$request_id = $data['request_id'] ?? null;
$student_id = $data['student_id'] ?? null;
$fingerprint_id = $data['fingerprint_id'] ?? null;
$status = $data['status'] ?? null;

if (
    $request_id === null ||
    $student_id === null ||
    $fingerprint_id === null ||
    $status === null
) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing required fields"
    ]);
    exit;
}

/* -----------------------------
   SUCCESS
----------------------------- */
if ($status === "success") {

    // Update student fingerprint
    $updateStudent = "
    UPDATE students
    SET fingerprint_id = '$fingerprint_id'
    WHERE student_id = '$student_id'
    ";

    $conn->query($updateStudent);

    // Complete request
    $updateRequest = "
    UPDATE enrollment_requests
    SET status = 'completed'
    WHERE request_id = '$request_id'
    ";

    $conn->query($updateRequest);

    // Log event
    $conn->query("
    INSERT INTO attendance_logs
    (fingerprint_id, student_id, event_type, message)
    VALUES
    ('$fingerprint_id', '$student_id',
    'enrollment_success',
    'Fingerprint enrollment completed')
    ");

    echo json_encode([
        "status" => "success",
        "message" => "Enrollment completed"
    ]);

} else {

    // Failed enrollment
    $updateRequest = "
    UPDATE enrollment_requests
    SET status = 'failed'
    WHERE request_id = '$request_id'
    ";

    $conn->query($updateRequest);

    $conn->query("
    INSERT INTO attendance_logs
    (student_id, event_type, message)
    VALUES
    ('$student_id',
    'enrollment_failed',
    'Fingerprint enrollment failed')
    ");

    echo json_encode([
        "status" => "failed",
        "message" => "Enrollment failed"
    ]);
}

$conn->close();

?>