<<<<<<< HEAD

<?php
session_start();

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "user_id" => (int) $_SESSION['unique_id']
]);
=======

<?php
session_start();

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "user_id" => (int) $_SESSION['unique_id']
]);
>>>>>>> origin/main
