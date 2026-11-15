
<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

// Check authentication
if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

// Get requested user ID
$data = json_decode(file_get_contents("php://input"), true);
$target_id = isset($data['unique_id']) ? (int)$data['unique_id'] : 0;

if ($target_id <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid user ID"
    ]);
    exit;
}

// Fetch public key
$stmt = mysqli_prepare(
    $conn,
    "SELECT public_key FROM user_public_keys WHERE unique_id = ?"
);

mysqli_stmt_bind_param($stmt, "i", $target_id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if ($row = mysqli_fetch_assoc($result)) {
    echo json_encode([
        "success" => true,
        "public_key" => json_decode($row['public_key'], true)
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Public key not found"
    ]);
}

mysqli_stmt_close($stmt);
?>
