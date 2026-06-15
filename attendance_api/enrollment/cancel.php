<?php

header("Content-Type: application/json");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$request_id = $data['request_id'] ?? null;

if (!$request_id) {
    echo json_encode([
        "status" => "error",
        "message" => "Missing request_id"
    ]);
    exit;
}

/* Verify request exists */
$checkQuery = "
SELECT request_id
FROM enrollment_requests
WHERE request_id = '$request_id'
AND status = 'processing'
";

$checkResult = $conn->query($checkQuery);

if ($checkResult->num_rows === 0) {
    echo json_encode([
        "status" => "rejected",
        "message" => "Invalid request"
    ]);
    exit;
}

/* Mark failed */
$updateQuery = "
UPDATE enrollment_requests
SET status = 'failed'
WHERE request_id = '$request_id'
";

if ($conn->query($updateQuery)) {
    echo json_encode([
        "status" => "success",
        "message" => "Enrollment cancelled"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to update request"
    ]);
}

$conn->close();

?>