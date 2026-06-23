<?php
include("../cors_headers.php");
include("../config/database.php");

$query = "SELECT student_id, nim, name, email, semester, academic_year, fingerprint_id, created_at 
          FROM students 
          ORDER BY student_id DESC";
$result = mysqli_query($conn, $query);

$students = [];
while ($row = mysqli_fetch_assoc($result)) {
    $students[] = $row;
}

echo json_encode(["status" => "success", "students" => $students]);
mysqli_close($conn);
?>