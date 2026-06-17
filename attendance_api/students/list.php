<?php
include("../cors_headers.php");
include("../config/database.php");

if (!$conn) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}

$query = "SELECT student_id, nim, name, email, fingerprint_id, created_at FROM students ORDER BY student_id DESC";
$result = mysqli_query($conn, $query);

if (!$result) {
    echo json_encode(["status" => "error", "message" => "Query failed: " . mysqli_error($conn)]);
    exit;
}

$students = [];
while ($row = mysqli_fetch_assoc($result)) {
    $students[] = $row;
}

echo json_encode(["status" => "success", "students" => $students]);
mysqli_close($conn);
?>