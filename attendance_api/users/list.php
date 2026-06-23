<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT u.user_id, u.email, u.full_name, u.role, u.is_active, u.created_at,
          l.lecturer_id, l.lecturer_code, l.department
          FROM users u
          LEFT JOIN lecturers l ON u.user_id = l.user_id
          ORDER BY u.user_id ASC";

$result = mysqli_query($conn, $query);

$users = [];
while ($row = mysqli_fetch_assoc($result)) {
    // If lecturer, get their info
    if ($row['role'] === 'lecturer' && $row['lecturer_id']) {
        $row['lecturer_info'] = [
            'lecturer_id' => $row['lecturer_id'],
            'lecturer_code' => $row['lecturer_code'],
            'department' => $row['department']
        ];
    }
    // Remove lecturer-specific fields from main object
    unset($row['lecturer_id']);
    unset($row['lecturer_code']);
    unset($row['department']);
    
    $users[] = $row;
}

echo json_encode(["status" => "success", "users" => $users]);
mysqli_close($conn);
?>