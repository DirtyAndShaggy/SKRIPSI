<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT user_id, email, full_name, role, is_active, created_at FROM users ORDER BY user_id ASC";
$result = mysqli_query($conn, $query);

$users = [];
while ($row = mysqli_fetch_assoc($result)) {
    $users[] = $row;
}

echo json_encode(["status" => "success", "users" => $users]);
mysqli_close($conn);
?>