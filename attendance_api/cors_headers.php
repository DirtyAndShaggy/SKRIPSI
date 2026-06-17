<?php
// Global CORS headers - include this at the top of ALL API files
header("Access-Control-Allow-Origin: *"); // Allow all origins (MUST CHNAGE TO DOAIN WHEN FNISHED)
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}
?>