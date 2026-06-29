<?php
include("../cors_headers.php");
include("../config/database.php");

$action = $_GET['action'] ?? 'list';

// LIST cohorts
if ($action === 'list') {
    $query = "SELECT * FROM cohorts ORDER BY start_year DESC";
    $result = mysqli_query($conn, $query);
    $cohorts = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $cohorts[] = $row;
    }
    echo json_encode(["status" => "success", "cohorts" => $cohorts]);
    exit;
}

// ADD cohort
if ($action === 'add') {
    $data = json_decode(file_get_contents("php://input"), true);
    $cohort_name = $data['cohort_name'] ?? '';
    $cohort_code = $data['cohort_code'] ?? '';
    $start_year = $data['start_year'] ?? null;
    
    if (empty($cohort_name)) {
        echo json_encode(["status" => "error", "message" => "Cohort name required"]);
        exit;
    }
    
    $start_year_value = $start_year ? "'$start_year'" : "NULL";
    
    $query = "INSERT INTO cohorts (cohort_name, cohort_code, start_year) 
              VALUES ('$cohort_name', '$cohort_code', $start_year_value)";
    
    if (mysqli_query($conn, $query)) {
        echo json_encode(["status" => "success", "cohort_id" => mysqli_insert_id($conn)]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
    exit;
}

// EDIT cohort
if ($action === 'update') {
    $data = json_decode(file_get_contents("php://input"), true);
    $cohort_id = $data['cohort_id'] ?? 0;
    $cohort_name = $data['cohort_name'] ?? '';
    $cohort_code = $data['cohort_code'] ?? '';
    $start_year = $data['start_year'] ?? null;
    
    if (!$cohort_id || empty($cohort_name)) {
        echo json_encode(["status" => "error", "message" => "Cohort ID and name required"]);
        exit;
    }
    
    $start_year_value = $start_year ? "'$start_year'" : "NULL";
    
    $query = "UPDATE cohorts SET 
              cohort_name = '$cohort_name', 
              cohort_code = '$cohort_code', 
              start_year = $start_year_value 
              WHERE cohort_id = '$cohort_id'";
    
    if (mysqli_query($conn, $query)) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
    exit;
}

if ($action === 'update_status') {
    $data = json_decode(file_get_contents("php://input"), true);
    $cohort_id = $data['cohort_id'] ?? 0;
    $is_active = $data['is_active'] ?? 1;
    
    $query = "UPDATE cohorts SET is_active = '$is_active' WHERE cohort_id = '$cohort_id'";
    if (mysqli_query($conn, $query)) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
    exit;
}

// DELETE cohort
if ($action === 'delete') {
    $data = json_decode(file_get_contents("php://input"), true);
    $cohort_id = $data['cohort_id'] ?? 0;
    
    $query = "DELETE FROM cohorts WHERE cohort_id = '$cohort_id'";
    if (mysqli_query($conn, $query)) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => mysqli_error($conn)]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Invalid action"]);
mysqli_close($conn);
?>