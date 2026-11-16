
<?php
session_start();
require_once "config.php";

header("Content-Type: application/json; charset=UTF-8");

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Unauthorized"
    ]);
    exit;
}

$outgoing_id = (int) $_SESSION['unique_id'];

$sql = "
    SELECT
        u.unique_id,
        u.fname,
        u.lname,
        u.img,
        u.status,
        m.msg_id AS last_message_id,
        CASE
            WHEN m.msg_id IS NULL THEN 'No message available'
            WHEN m.msg IS NOT NULL AND m.msg != '' THEN m.msg
            ELSE 'Encrypted message'
        END AS last_message,
        CASE
            WHEN m.outgoing_msg_id = ? THEN 1
            ELSE 0
        END AS is_sender

    FROM users u

    LEFT JOIN messages m ON m.msg_id = (
        SELECT msg_id
        FROM messages
        WHERE
            (
                incoming_msg_id = u.unique_id
                AND outgoing_msg_id = ?
            )
            OR
            (
                outgoing_msg_id = u.unique_id
                AND incoming_msg_id = ?
            )
        ORDER BY msg_id DESC
        LIMIT 1
    )

    WHERE u.unique_id != ?

    ORDER BY
    m.created_at DESC,
    m.msg_id DESC,
    u.user_id DESC
";

$stmt = mysqli_prepare($conn, $sql);

if (!$stmt) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database query failed"
    ]);
    exit;
}

mysqli_stmt_bind_param(
    $stmt,
    "iiii",
    $outgoing_id,
    $outgoing_id,
    $outgoing_id,
    $outgoing_id
);

mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

$users = [];

while ($row = mysqli_fetch_assoc($result)) {

    $lastMessage = $row['last_message'];

    if (strlen($lastMessage) > 28) {
        $lastMessage = substr($lastMessage, 0, 28) . "...";
    }

    $users[] = [
        "unique_id" => (int) $row['unique_id'],
        "fname" => $row['fname'],
        "lname" => $row['lname'],
        "full_name" => $row['fname'] . " " . $row['lname'],
        "img" => $row['img'],
        "status" => $row['status'],
        "online" => $row['status'] !== "Offline now",
        "last_message" => $lastMessage,
        "is_sender" => (bool) $row['is_sender']
    ];
}

echo json_encode([
    "success" => true,
    "users" => $users
]);

mysqli_stmt_close($stmt);
?>
