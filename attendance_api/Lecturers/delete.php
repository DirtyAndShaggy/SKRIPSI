<?php
include("../cors_headers.php");
include("../config/database.php");

$data = json_decode(file_get_contents("php://input"), true);
$lecturer_id = $data['lecturer_id'] ?? 0;

if (!$lecturer_id) {
    echo json_encode(["status" => "error", "message" => "Lecturer ID required"]);
    exit;
}

// Check if lecturer has classes
$checkQuery = "SELECT COUNT(*) as total FROM classes WHERE lecturer_id = '$lecturer_id'";
$checkResult = mysqli_query($conn, $checkQuery);
$count = mysqli_fetch_assoc($checkResult);

if ($count['total'] > 0) {
    echo json_encode(["status" => "error", "message" => "Cannot delete lecturer with " . $count['total'] . " class(es) assigned"]);
    exit;
}

$query = "DELETE FROM lecturers WHERE lecturer_id = '$lecturer_id'";

if (mysqli_query($conn, $query)) {
    echo json_encode(["status" => "success", "message" => "Lecturer deleted"]);
} else {
    echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
}

mysqli_close($conn);
?>