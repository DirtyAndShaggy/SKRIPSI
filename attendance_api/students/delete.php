<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$student_id = $data['id'] ?? 0;

if (!$student_id) {
    echo json_encode(["status" => "error", "message" => "Student ID required"]);
    exit;
}

$query = "DELETE FROM students WHERE student_id = '$student_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>