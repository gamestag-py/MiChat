<?php
session_start();
include_once "config.php";

// =====================================
// AUTHENTICATION
// =====================================

if (!isset($_SESSION['unique_id'])) {
    http_response_code(401);
    exit("Not authenticated");
}

$current_id = (int) $_SESSION['unique_id'];

$user_id = filter_input(
    INPUT_GET,
    'user_id',
    FILTER_VALIDATE_INT
);

if (!$user_id || $user_id <= 0 || $user_id === $current_id) {
    http_response_code(400);
    exit("Invalid user");
}


// =====================================
// FETCH RECIPIENT
// =====================================

$stmt = mysqli_prepare(
    $conn,
    "SELECT unique_id, fname, lname, img, status, bio
     FROM users
     WHERE unique_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);

$row = mysqli_fetch_assoc(
    mysqli_stmt_get_result($stmt)
);

mysqli_stmt_close($stmt);

if (!$row) {
    http_response_code(404);
    exit("User not found");
}


// =====================================
// CHECK IF RECIPIENT BLOCKED CURRENT USER
// =====================================

$blockStmt = mysqli_prepare(
    $conn,
    "SELECT id
     FROM user_blocks
     WHERE blocker_id = ?
       AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param(
    $blockStmt,
    "ii",
    $user_id,
    $current_id
);

mysqli_stmt_execute($blockStmt);

$isBlockedByRecipient = mysqli_num_rows(
    mysqli_stmt_get_result($blockStmt)
) > 0;

mysqli_stmt_close($blockStmt);


// =====================================
// CHECK IF CURRENT USER BLOCKED RECIPIENT
// =====================================

$myBlockStmt = mysqli_prepare(
    $conn,
    "SELECT id
     FROM user_blocks
     WHERE blocker_id = ?
       AND blocked_id = ?
     LIMIT 1"
);

mysqli_stmt_bind_param(
    $myBlockStmt,
    "ii",
    $current_id,
    $user_id
);

mysqli_stmt_execute($myBlockStmt);

$isBlockedByMe = mysqli_num_rows(
    mysqli_stmt_get_result($myBlockStmt)
) > 0;

mysqli_stmt_close($myBlockStmt);

// =====================================
// PROFILE DATA
// =====================================

$fullName = trim(
    $row['fname'] . " " . $row['lname']
);

$profileImage = "php/images/" . htmlspecialchars(
    $row['img'] ?: 'default.png',
    ENT_QUOTES,
    'UTF-8'
);

$fname = htmlspecialchars($row['fname'], ENT_QUOTES, 'UTF-8');
$lname = htmlspecialchars($row['lname'], ENT_QUOTES, 'UTF-8');
$status = htmlspecialchars($row['status'], ENT_QUOTES, 'UTF-8');
$bio = htmlspecialchars($row['bio'] ?? '', ENT_QUOTES, 'UTF-8');

?>

<div class="chat-area" style="max-height: 100vh;" data-chat-user="<?php echo $user_id; ?>">

    <!-- =================================
         CHAT HEADER
    ================================== -->

    <header class="chat-header">

        <button type="button" class="back-icon" id="backToInbox">
            <i class="fas fa-arrow-left"></i>
        </button>

        <!-- CLICKABLE USER PROFILE -->
        <div
            class="chat-profile-trigger"
            data-user-id="<?php echo $user_id; ?>"
            data-fname="<?php echo $fname; ?>"
            data-lname="<?php echo $lname; ?>"
            data-img="<?php echo htmlspecialchars($row['img'] ?? '', ENT_QUOTES, 'UTF-8'); ?>"
            data-status="<?php echo $status; ?>"
            data-bio="<?php echo $bio; ?>"
            data-blocked="<?php echo $isBlockedByMe ? 'true' : 'false'; ?>">

            <img
                class="chat-user-avatar"
                src="<?php echo $profileImage; ?>"
                alt="Profile picture">

            <div class="chat-user-details">

                <strong>
                    <?php echo htmlspecialchars($fullName); ?>
                </strong>

                <span>
                    <span class="online-dot"></span>
                    <?php echo $status; ?>
                </span>

            </div>

        </div>

        <div class="chat-header-actions">

            <span class="secure-indicator">
                <i class="fas fa-lock"></i>
                <span>Encrypted</span>
            </span>

            <button
                type="button"
                class="icon-btn chat-options-btn"
                title="Conversation options">
                <i class="fas fa-ellipsis-v"></i>
            </button>

        </div>

    </header>


    <!-- =================================
         ENCRYPTION NOTICE
    ================================== -->

    <div class="encryption-notice">
        <i class="fas fa-shield-alt"></i>
        <span>Messages are encrypted on your device.</span>
    </div>


    <!-- =================================
         CHAT MESSAGES
    ================================== -->

    <div
        class="chat-box"
        data-current-id="<?php echo $current_id; ?>"></div>


    <!-- =================================
         MESSAGE COMPOSER / BLOCKED NOTICE
    ================================== -->

    <?php if ($isBlockedByRecipient): ?>

        <div class="chat-blocked-notice">

            <i class="fas fa-ban"></i>

            <span>
                You cannot send messages to this user.
            </span>

        </div>

    <?php else: ?>

        <form action="#" class="typing-area">

            <input
                type="hidden"
                class="incoming_id"
                value="<?php echo $user_id; ?>">

            <button type="button" class="composer-icon">
                <i class="fas fa-paperclip"></i>
            </button>

            <div class="message-input-wrap">

                <input
                    type="text"
                    class="input-field"
                    placeholder="Write a message..."
                    autocomplete="off">

                <span class="composer-hint">
                    Press Enter to send
                </span>

            </div>

            <button type="submit" class="send-button">
                <i class="fas fa-paper-plane"></i>
            </button>

        </form>

    <?php endif; ?>

</div>


<!-- =====================================
     OTHER USER PROFILE POPUP
====================================== -->

<div class="other-user-popup" id="otherUserPopup">

    <!-- BACKDROP -->
    <div
        class="other-user-popup-backdrop"
        data-close-profile></div>


    <!-- POPUP CARD -->
    <div class="other-user-popup-card">

        <!-- HEADER -->
        <div class="other-user-popup-header">

            <strong>Profile details</strong>

            <button
                type="button"
                data-close-profile
                class="other-user-close-btn"
                aria-label="Close profile">
                <i class="fas fa-times"></i>
            </button>

        </div>


        <!-- COVER -->
        <div class="other-user-cover"></div>


        <!-- PROFILE CONTENT -->
        <div class="other-user-content">

            <img
                src="<?php echo $profileImage; ?>"
                class="other-user-avatar"
                id="otherUserPopupImage"
                alt="User profile">

            <h2 id="otherUserPopupName">
                <?php echo htmlspecialchars($fullName); ?>
            </h2>


            <!-- STATUS -->
            <div class="other-user-status">

                <span
                    class="other-user-status-dot"
                    id="otherUserPopupStatusDot"></span>

                <span id="otherUserPopupStatus">
                    <?php echo $status; ?>
                </span>

            </div>


            <!-- BIO -->
            <div class="other-user-bio-box">

                <span class="other-user-label">
                    ABOUT
                </span>

                <p id="otherUserPopupBio">
                    <?php
                    echo htmlspecialchars(
                        $row['bio'] ?: 'No bio added yet.'
                    );
                    ?>
                </p>

            </div>


            <!-- USER ID -->
            <div class="other-user-id">

                User ID:

                <span id="otherUserPopupId">
                    <?php echo $user_id; ?>
                </span>

            </div>


            <!-- BLOCK ACTION -->
            <!-- BLOCK / UNBLOCK ACTION -->

            <?php if ($isBlockedByRecipient): ?>

                <div class="other-user-blocked-label">
                    <i class="fas fa-ban"></i>
                    This user has blocked you.
                </div>

            <?php else: ?>

                <div class="other-user-actions">

                    <button
                        type="button"
                        class="block-user-btn"
                        id="blockUserBtn"
                        data-user-id="<?php echo $user_id; ?>"
                        data-blocked="<?php echo $isBlockedByMe ? 'true' : 'false'; ?>">
                        <?php if ($isBlockedByMe): ?>
                            <i class="fas fa-unlock"></i>
                            Unblock User
                        <?php else: ?>
                            <i class="fas fa-ban"></i>
                            Block User
                        <?php endif; ?>
                    </button>

                </div>

            <?php endif; ?>

        </div>

    </div>

</div>