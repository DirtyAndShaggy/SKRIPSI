<?php

header("Content-Type: application/json");
include("../config/database.php");

$device_id = $_GET['device_id'] ?? null;

if (!$device_id) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing device_id"
    ]);
    exit;
}

/* -----------------------------
   Find pending request
----------------------------- */
$query = "
SELECT request_id, student_id, fingerprint_slot
FROM enrollment_requests
WHERE device_id = '$device_id'
AND status = 'pending'
ORDER BY created_at ASC
LIMIT 1
";

$result = $conn->query($query);

if ($result->num_rows === 0) {

    echo json_encode([
        "status" => "idle",
        "message" => "No pending enrollment"
    ]);

    exit;
}

$request = $result->fetch_assoc();

/* -----------------------------
   Return task to device
----------------------------- */
echo json_encode([
    "status" => "pending",
    "request_id" => $request['request_id'],
    "student_id" => $request['student_id'],
    "fingerprint_slot" => $request['fingerprint_slot']
]);

$conn->close();

?>