<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$student_id = $data['id'] ?? 0;
$nim = $data['nim'] ?? '';
$name = $data['name'] ?? '';
$email = $data['email'] ?? '';
$fingerprint_id = $data['fingerprint_id'] ?? null;

if (!$student_id) {
    echo json_encode(["status" => "error", "message" => "Student ID required"]);
    exit;
}

$fingerprint_value = $fingerprint_id ? "'$fingerprint_id'" : "NULL";

$query = "UPDATE students SET nim='$nim', name='$name', email='$email', fingerprint_id=$fingerprint_value WHERE student_id='$student_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>