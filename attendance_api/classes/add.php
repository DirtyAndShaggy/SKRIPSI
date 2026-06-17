<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);

$class_code = $data['class_code'] ?? '';
$class_name = $data['class_name'] ?? '';
$lecturer_name = $data['lecturer_name'] ?? '';
$room_name = $data['room_name'] ?? '';

if (empty($class_code) || empty($class_name)) {
    echo json_encode(["status" => "error", "message" => "Class code and name required"]);
    exit;
}

$query = "INSERT INTO classes (class_code, class_name, lecturer_name, room_name) VALUES ('$class_code', '$class_name', '$lecturer_name', '$room_name')";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "class_id" => mysqli_insert_id($conn)]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>