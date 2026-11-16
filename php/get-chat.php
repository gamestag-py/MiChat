
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

$data = json_decode(file_get_contents("php://input"), true);
$incoming_id = (int) ($data['incoming_id'] ?? 0);

if ($incoming_id <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid recipient"
    ]);
    exit;
}

$stmt = mysqli_prepare(
    $conn,
    "SELECT
        m.msg_id,
        m.incoming_msg_id,
        m.outgoing_msg_id,
        m.encrypted_msg,
        m.encrypted_key_sender,
        m.encrypted_key_recipient,
        m.iv,
        u.img,
        m.delivered_at,
        m.seen_at
    FROM messages m
    LEFT JOIN users u
        ON u.unique_id = m.outgoing_msg_id
    WHERE
        (
            (
                m.outgoing_msg_id = ?
                AND m.incoming_msg_id = ?
            )
            OR
            (
                m.outgoing_msg_id = ?
                AND m.incoming_msg_id = ?
            )
        )
        AND (
            m.expires_at IS NULL
            OR m.expires_at > NOW()
        )
    ORDER BY m.msg_id ASC"
);

mysqli_stmt_bind_param(
    $stmt,
    "iiii",
    $current_id,
    $incoming_id,
    $incoming_id,
    $current_id
);

mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

$messages = [];

while ($row = mysqli_fetch_assoc($result)) {
    $messages[] = $row;
}

echo json_encode([
    "success" => true,
    "messages" => $messages
]);

mysqli_stmt_close($stmt);
?>
