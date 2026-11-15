
<?php
session_start();
include_once "php/config.php";

if (!isset($_SESSION['unique_id'])) {
    header("location: login.php");
    exit;
}

$current_id = (int) $_SESSION['unique_id'];
$user_id = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);

if (!$user_id || $user_id <= 0 || $user_id === $current_id) {
    header("location: users.php");
    exit;
}

// Get logged-in user
$stmt = mysqli_prepare(
    $conn,
    "SELECT fname, lname, img FROM users WHERE unique_id = ?"
);
mysqli_stmt_bind_param($stmt, "i", $current_id);
mysqli_stmt_execute($stmt);
$me = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

// Get recipient
$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id, fname, lname, img, status
     FROM users WHERE unique_id = ?"
);
mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);
$row = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

if (!$me || !$row) {
    header("location: users.php");
    exit;
}

include_once "header.php";
?>

<link rel="stylesheet" href="css/chat-app.css">

<body>
<div class="app-shell">

    <!-- Navigation sidebar -->
    <aside class="nav-sidebar">
        <a href="users.php" class="brand">
            <span class="brand-icon"><i class="fas fa-comment-dots"></i></span>
        </a>

        <nav class="nav-menu">
            <a href="users.php" class="nav-item active" title="Chats">
                <i class="fas fa-comments"></i>
            </a>

            <a href="users.php" class="nav-item" title="Contacts">
                <i class="fas fa-address-book"></i>
            </a>

            <a href="#" class="nav-item" title="Settings">
                <i class="fas fa-cog"></i>
            </a>
        </nav>

        <div class="nav-bottom">
            <a href="php/logout.php?logout_id=<?php echo $current_id; ?>"
               class="nav-item logout-icon" title="Logout">
                <i class="fas fa-sign-out-alt"></i>
            </a>

            <img src="php/images/<?php echo htmlspecialchars($me['img']); ?>"
                 class="nav-avatar" alt="Profile">
        </div>
    </aside>

    <!-- Chat header and messages -->
    <section class="chat-area">

        <header class="chat-header">

            <a href="users.php" class="back-icon" title="Back to chats">
                <i class="fas fa-arrow-left"></i>
            </a>

            <img class="chat-user-avatar"
                 src="php/images/<?php echo htmlspecialchars($row['img']); ?>"
                 alt="">

            <div class="chat-user-details">
                <strong>
                    <?php echo htmlspecialchars($row['fname'] . " " . $row['lname']); ?>
                </strong>

                <span>
                    <span class="online-dot"></span>
                    <?php echo htmlspecialchars($row['status']); ?>
                </span>
            </div>

            <div class="chat-header-actions">
                <span class="secure-indicator">
                    <i class="fas fa-lock"></i>
                    <span>Encrypted</span>
                </span>

                <button type="button" class="icon-btn" title="More options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>

        </header>

        <!-- Encryption information -->
        <div class="encryption-notice">
            <i class="fas fa-shield-alt"></i>
            <span>Messages are encrypted on your device.</span>
        </div>

        <!-- Existing chat.js uses this element -->
        <div class="chat-box"
             data-current-id="<?php echo $current_id; ?>">
        </div>

        <!-- Message composer -->
        <form action="#" class="typing-area">

            <input type="hidden"
                   class="incoming_id"
                   name="incoming_id"
                   value="<?php echo $user_id; ?>">

            <button type="button" class="composer-icon" title="Attach file">
                <i class="fas fa-paperclip"></i>
            </button>

            <div class="message-input-wrap">
                <input type="text"
                       name="message"
                       class="input-field"
                       placeholder="Write a message..."
                       autocomplete="off">

                <span class="composer-hint">Press Enter to send</span>
            </div>

            <button type="submit" class="send-button" title="Send message">
                <i class="fas fa-paper-plane"></i>
            </button>

        </form>

    </section>
</div>

<script src="javascript/crypto.js"></script>
<script src="javascript/chat.js"></script>

</body>
</html>
