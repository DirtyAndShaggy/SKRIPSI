<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT l.lecturer_id, l.lecturer_code, l.full_name, l.email, l.phone, 
          l.department, l.specialization, l.is_active, l.user_id,
          u.email as user_email
          FROM lecturers l
          LEFT JOIN users u ON l.user_id = u.user_id
          ORDER BY l.full_name ASC";

$result = mysqli_query($conn, $query);

$lecturers = [];
while ($row = mysqli_fetch_assoc($result)) {
    // Convert is_active to integer to ensure correct value
    $row['is_active'] = (int)$row['is_active'];
    $lecturers[] = $row;
}

echo json_encode(["status" => "success", "lecturers" => $lecturers]);
mysqli_close($conn);
?>