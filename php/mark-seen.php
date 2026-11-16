<?php
session_start();
include_once "config.php";

header("Content-Type: application/json");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "Not authenticated"
    ]);
    exit;
}

$current_id = (int) $_SESSION['unique_id'];
$with_id = filter_input(INPUT_GET, 'with_id', FILTER_VALIDATE_INT);

if (!$with_id || $with_id <= 0 || $with_id === $current_id) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid user ID"
    ]);
    exit;
}

$stmt = mysqli_prepare(
    $conn,
    "UPDATE messages
     SET
        delivered_at = COALESCE(delivered_at, NOW()),
        seen_at = COALESCE(seen_at, NOW()),
        expires_at = CASE
            WHEN disappear_after_seconds > 0
            THEN COALESCE(
                expires_at,
                DATE_ADD(NOW(), INTERVAL disappear_after_seconds SECOND)
            )
            ELSE expires_at
        END
     WHERE
        outgoing_msg_id = ?
        AND incoming_msg_id = ?
        AND seen_at IS NULL
        AND (
            expires_at IS NULL
            OR expires_at > NOW()
        )"
);

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database query preparation failed"
    ]);
    exit;
}

mysqli_stmt_bind_param(
    $stmt,
    "ii",
    $with_id,
    $current_id
);

if (!mysqli_stmt_execute($stmt)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to update messages"
    ]);
    mysqli_stmt_close($stmt);
    exit;
}

$updated = mysqli_stmt_affected_rows($stmt);

echo json_encode([
    "success" => true,
    "message" => "Messages marked as seen",
    "updated_messages" => $updated
]);

mysqli_stmt_close($stmt);
?>