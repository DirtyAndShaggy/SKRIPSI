<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once __DIR__ . '/../config/database.php';

$user_id = $_GET['user_id'] ?? 0;

if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'user_id required']);
    exit;
}

// Get lecturer_id from user
$lecturerQuery = "SELECT lecturer_id FROM lecturers WHERE user_id = '$user_id'";
$lecturerResult = mysqli_query($conn, $lecturerQuery);

if (!$lecturerResult || mysqli_num_rows($lecturerResult) === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Lecturer not found for this user']);
    exit;
}

$lecturer = mysqli_fetch_assoc($lecturerResult);
$lecturer_id = $lecturer['lecturer_id'];

// Get all classes taught by this lecturer
$classQuery = "SELECT class_id FROM classes WHERE lecturer_id = '$lecturer_id'";
$classResult = mysqli_query($conn, $classQuery);
$classIds = [];
while ($row = mysqli_fetch_assoc($classResult)) {
    $classIds[] = $row['class_id'];
}

if (empty($classIds)) {
    echo json_encode([
        'status' => 'success',
        'data' => [
            'cohorts' => [],
            'groups' => [],
            'semesters' => []
        ]
    ]);
    exit;
}

$classIdList = implode(',', $classIds);

// Get all groups that have schedules in these classes
$query = "
    SELECT DISTINCT 
        g.group_id,
        g.group_name,
        g.group_code,
        g.cohort_id,
        g.semester,
        g.is_active,
        c.cohort_name,
        c.cohort_code,
        cs.semester as schedule_semester
    FROM `groups` g
    JOIN class_schedules cs ON g.group_id = cs.group_id
    JOIN cohorts c ON g.cohort_id = c.cohort_id
    WHERE cs.class_id IN ($classIdList)
    AND g.is_active = 1
    ORDER BY c.cohort_name, g.group_name
";

$result = mysqli_query($conn, $query);
$groups = [];
$cohortMap = [];
$semesters = [];

while ($row = mysqli_fetch_assoc($result)) {
    $cohortId = $row['cohort_id'];
    if (!isset($cohortMap[$cohortId])) {
        $cohortMap[$cohortId] = [
            'cohort_id' => $cohortId,
            'cohort_name' => $row['cohort_name'],
            'cohort_code' => $row['cohort_code'],
            'groups' => []
        ];
    }
    
    $cohortMap[$cohortId]['groups'][] = [
        'group_id' => $row['group_id'],
        'group_name' => $row['group_name'],
        'group_code' => $row['group_code'],
        'semester' => $row['semester'],
        'is_active' => $row['is_active']
    ];
    
    if ($row['schedule_semester'] && !in_array($row['schedule_semester'], $semesters)) {
        $semesters[] = $row['schedule_semester'];
    }
}

$cohorts = array_values($cohortMap);
sort($semesters);

echo json_encode([
    'status' => 'success',
    'data' => [
        'cohorts' => $cohorts,
        'groups' => $groups,
        'semesters' => $semesters
    ]
]);

mysqli_close($conn);
?>