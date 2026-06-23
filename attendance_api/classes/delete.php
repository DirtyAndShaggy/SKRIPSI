<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$class_id = $data['class_id'] ?? 0;

if (!$class_id) {
    echo json_encode(["status" => "error", "message" => "Class ID required"]);
    exit;
}

// Check if class has students enrolled
$checkQuery = "SELECT COUNT(*) as total FROM student_classes WHERE class_id = '$class_id'";
$checkResult = mysqli_query($conn, $checkQuery);
$count = mysqli_fetch_assoc($checkResult);

if ($count['total'] > 0) {
    echo json_encode(["status" => "error", "message" => "Cannot delete class with enrolled students. Remove students first."]);
    exit;
}

// Delete class (cascade will handle schedules)
$query = "DELETE FROM classes WHERE class_id = '$class_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Class deleted"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>