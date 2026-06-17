<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$nim = $data['nim'] ?? '';
$name = $data['name'] ?? '';
$email = $data['email'] ?? '';
$fingerprint_id = $data['fingerprint_id'] ?? null;

if (empty($nim) || empty($name)) {
    echo json_encode(["status" => "error", "message" => "NIM and Name required"]);
    exit;
}

$fingerprint_value = $fingerprint_id ? "'$fingerprint_id'" : "NULL";

$query = "INSERT INTO students (nim, name, email, fingerprint_id) VALUES ('$nim', '$name', '$email', $fingerprint_value)";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "student_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>