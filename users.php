<?php
session_start();
include_once "php/config.php";

if (!isset($_SESSION['unique_id'])) {
  header("location: login.php");
  exit;
}

$my_id = (int) $_SESSION['unique_id'];

$stmt = mysqli_prepare(
  $conn,
  "SELECT fname, lname, img, status , bio FROM users WHERE unique_id = ?"
);
mysqli_stmt_bind_param($stmt, "i", $my_id);
mysqli_stmt_execute($stmt);
$me = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

if (!$me) {
  header("location: login.php");
  exit;
}

include_once "header.php";
?>

<link rel="stylesheet" href="css/chat-app.css">

<body>

  <div class="app-shell">

    <!-- SIDEBAR -->
    <aside class="nav-sidebar">

      <a href="users.php" class="brand">
        <span class="brand-icon">
          <i class="fas fa-comment-dots"></i>
        </span>
      </a>

      <nav class="nav-menu">
        <a href="users.php" class="nav-item active" title="Chats">
          <i class="fas fa-comments"></i>
        </a>
        <a href="settings.php" class="nav-item" title="Settings">
          <i class="fas fa-cog"></i>
        </a>
      </nav>

      <div class="nav-bottom">

        <a href="php/logout.php?logout_id=<?php echo $my_id; ?>"
          class="nav-item logout-icon" title="Logout">
          <i class="fas fa-sign-out-alt"></i>
        </a>

        <img
          src="php/images/<?php echo htmlspecialchars($me['img']); ?>"
          class="nav-avatar"
          alt="Profile">

      </div>

    </aside>

    <!-- CONVERSATION LIST -->
    <main class="inbox-panel" id="inboxPanel">

      <div class="inbox-header">
        <div>
          <span class="eyebrow">MESSAGING</span>
          <h1>Messages</h1>
        </div>

        <button id="ham-bar" onclick="toggleMenu()" class="icon-btn" title="New conversation">
          <i class="fas fa-bars"></i>
        </button>
      </div>

      <div class="profile-card" id="myProfileTrigger">

        <img
          src="php/images/<?php echo htmlspecialchars($me['img']); ?>"
          alt="My profile">

        <div class="profile-info">
          <strong>
            <?php echo htmlspecialchars($me['fname'] . " " . $me['lname']); ?>
          </strong>

          <span>
            <span class="online-dot"></span>
            <?php echo htmlspecialchars($me['status']); ?>
          </span>
        </div>

        <i class="fas fa-ellipsis-h profile-more"></i>

      </div>

      <div class="search-section">
        <div class="search">
          <i class="fas fa-search search-icon"></i>

          <input
            type="text"
            placeholder="Search conversations..."
            autocomplete="off">

          <button type="button">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </div>

      <div class="conversation-heading">
        <span>ALL MESSAGES</span>
        <span class="conversation-count">CHATS</span>
      </div>

      <div class="users-list">
        <!-- Populated by users.js -->
      </div>

      <div class="inbox-footer">
        <i class="fas fa-shield-alt"></i>
        <span>End-to-end encrypted messaging</span>
      </div>

    </main>

    <!-- CHAT CONTAINER -->
    <section class="conversation-panel" id="conversationPanel">

      <div class="conversation-placeholder">

        <div class="welcome-icon">
          <i class="fas fa-comments"></i>
        </div>

        <h2>Your conversations, in one place.</h2>

        <p>
          Select a conversation to start messaging.
          Your messages are encrypted on your device.
        </p>

        <div class="encryption-label">
          <i class="fas fa-lock"></i>
          End-to-end encryption enabled
        </div>

      </div>

    </section>




    <!-- MY PROFILE POPUP -->
    <div id="myProfilePopup" style="
    display:none;
    position:fixed;
    inset:0;
    z-index:99999;
    align-items:center;
    justify-content:center;
    padding:16px;
    background:rgba(0,0,0,.75);
    backdrop-filter:blur(5px);
">

      <!-- BACKDROP -->
      <div onclick="closeMyProfile()" style="
        position:absolute;
        inset:0;
    "></div>

      <!-- POPUP CARD -->
      <div style="
        position:relative;
        z-index:1;
        width:100%;
        max-width:370px;
        overflow:hidden;
        border:1px solid #29313e;
        border-radius:18px;
        background:#11151c;
        color:#e8edf5;
        box-shadow:0 25px 80px rgba(0,0,0,.5);
        animation:myProfileIn .2s ease;
    ">

        <!-- HEADER -->
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:17px 20px;
            border-bottom:1px solid #242b36;
        ">

          <strong style="font-size:14px;">
            My Profile
          </strong>

          <button type="button"
            onclick="closeMyProfile()"
            aria-label="Close profile"
            style="
                    width:32px;
                    height:32px;
                    border:1px solid #29313e;
                    border-radius:9px;
                    background:#171c25;
                    color:#aab4c3;
                    font-size:19px;
                    cursor:pointer;
                ">
            &times;
          </button>

        </div>

        <!-- COVER -->
        <div style="
            height:105px;
            background:#202a3a;
        "></div>

        <!-- PROFILE CONTENT -->
        <div style="
            padding:0 22px 22px;
            text-align:center;
        ">

          <!-- IMAGE -->
          <img
            id="myPopupImage"
            src="php/images/<?php echo htmlspecialchars($me['img']); ?>"
            alt="My profile picture"
            style="
                    width:100px;
                    height:100px;
                    margin-top:-50px;
                    object-fit:cover;
                    border:5px solid #11151c;
                    border-radius:50%;
                    background:#171c25;
                ">

          <!-- NAME -->
          <h2 id="myPopupName" style="
                margin:12px 0 7px;
                font-size:20px;
                font-weight:700;
            ">
            <?php echo htmlspecialchars($me['fname'] . " " . $me['lname']); ?>
          </h2>

          <!-- STATUS -->
          <div style="
                display:flex;
                align-items:center;
                justify-content:center;
                gap:7px;
                margin-bottom:20px;
                color:#8490a1;
                font-size:12px;
            ">

            <span style="
                    width:8px;
                    height:8px;
                    border-radius:50%;
                    background:#35c98a;
                "></span>

            <span id="myPopupStatus">
              <?php echo htmlspecialchars($me['status']); ?>
            </span>

          </div>

          <!-- BIO -->
          <div style="
                padding:15px;
                border:1px solid #242b36;
                border-radius:12px;
                background:#171c25;
                text-align:left;
            ">

            <div style="
                    margin-bottom:8px;
                    color:#8490a1;
                    font-size:10px;
                    font-weight:700;
                    letter-spacing:1px;
                ">
              ABOUT ME
            </div>

            <p id="myPopupBio" style="
                    margin:0;
                    color:#c3cbd7;
                    font-size:13px;
                    line-height:1.6;
                    overflow-wrap:anywhere;
                ">
              <?php echo htmlspecialchars($me['bio'] ?? 'No bio added yet.'); ?>
            </p>

          </div>

          <!-- EDIT PROFILE -->
          <button type="button"
            id="myPopupEditBtn"
            onclick="location.href='edit-profile.php'"
            style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                    width:100%;
                    margin-top:17px;
                    padding:12px;
                    border:0;
                    border-radius:9px;
                    background:#7c9cff;
                    color:#080d18;
                    font-size:13px;
                    font-weight:700;
                    cursor:pointer;
                ">

            <i class="fas fa-pen"></i>
            Edit Profile

          </button>

        </div>

      </div>

    </div>

    <style>
      @keyframes myProfileIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(.97);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #myProfilePopup button:hover {
        filter: brightness(1.12);
      }

      @media(max-width:480px) {
        #myProfilePopup {
          padding: 12px !important;
        }
      }
    </style>

  </div>

  <script>
    const myProfilePopup = document.getElementById("myProfilePopup");
    const myProfileTrigger = document.getElementById("myProfileTrigger");
    window.MICHAT_CURRENT_USER = <?php echo json_encode((string)$my_id); ?>;

    function toggleMenu() {
      document.querySelector(".nav-sidebar").classList.toggle('active');
    }

    function openMyProfile() {
      if (!myProfilePopup) return;

      myProfilePopup.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    function closeMyProfile() {
      if (!myProfilePopup) return;

      myProfilePopup.style.display = "none";
      document.body.style.overflow = "";
    }

    myProfileTrigger?.addEventListener("click", openMyProfile);

    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") {
        closeMyProfile();
      }
    });

    function showNewMessagePopup(msg) {

      const senderId = msg.outgoing_msg_id;

      const existingPopup = document.getElementById("newMessagePopup");

      if (existingPopup) {
        existingPopup.remove();
      }

      const popup = document.createElement("div");

      popup.id = "newMessagePopup";
      popup.className = "new-message-popup";

      const img = document.createElement("img");

      img.src = msg.img ?
        "php/images/" + encodeURIComponent(msg.img) :
        "php/images/default.png";

      img.alt = "";

      const content = document.createElement("div");

      const title = document.createElement("strong");
      title.textContent = "New message";

      const description = document.createElement("p");
      description.textContent = "You received a new message.";

      content.append(title, description);

      const button = document.createElement("button");
      button.textContent = "Open";

      button.addEventListener("click", () => {
        popup.remove();

        // Use your existing chat-opening function.
        openChat(senderId);
      });

      popup.append(img, content, button);

      document.body.appendChild(popup);

      setTimeout(() => {
        popup.remove();
      }, 6000);
    }


    let ws = null;
    let reconnectTimer = null;

    function connectWebSocket() {

      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) return;

      ws = new WebSocket("ws://localhost:8000");
      window.michatWS = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = async (event) => {

        let data;

        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("Invalid WebSocket response:", error);
          return;
        }

        console.log(data)
        if (data.type === "new_message") {

          const msg = data.message;
          if (!msg) return;

          const activeChat = document.querySelector(".chat-area");

          const isChatOpen =
            activeChat &&
            String(activeChat.dataset.chatUser) ===
            String(msg.outgoing_msg_id);

          if (
            isChatOpen &&
            typeof window.michatMessageHandler === "function"
          ) {
            await window.michatMessageHandler(data);

            ws.send(JSON.stringify({
              type: "message_seen",
              outgoing_msg_id: msg.outgoing_msg_id,
              msg_id: msg.msg_id
            }));

          } else {

            showNewMessagePopup(msg);

            ws.send(JSON.stringify({
              type: "message_delivered",
              outgoing_msg_id: msg.outgoing_msg_id,
              msg_id: msg.msg_id
            }));
          }

          return;
        }

        if (typeof window.michatMessageHandler === "function") {
          await window.michatMessageHandler(data);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");

        reconnectTimer = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    }

    connectWebSocket();
  </script>
  <script>
    window.michatDisappearAfterSeconds = 0;

    function toggleDisappearPicker() {
      const picker = document.getElementById("disappearPicker");

      picker.style.display =
        picker.style.display === "block" ? "none" : "block";
    }

    function selectDisappearDuration(button) {

      const duration = Number(button.dataset.duration);

      window.michatDisappearAfterSeconds = duration;

      const label = duration === 0 ?
        "Off" :
        duration < 60 ?
        duration + "s" :
        duration < 3600 ?
        (duration / 60) + "m" :
        (duration / 3600) + "h";

      document.getElementById("disappearToggle").textContent =
        "⏱ " + label;

      // Update selected option
      document.querySelectorAll("#disappearPicker [data-duration]")
        .forEach(option => {
          const selected = option === button;

          option.style.background = selected ? "#263956" : "#1b2432";
          option.style.borderColor = selected ? "#7c9cff" : "#303b4d";
          option.style.color = selected ? "#fff" : "#cbd5e1";
        });

      document.getElementById("disappearPicker").style.display = "none";
    }
  </script>

  <script src="javascript/users.js"></script>
  <script src="javascript/crypto.js"></script>
  <script src="javascript/chat.js"></script>
  <script src="javascript/dashboard.js"></script>
  <script src="javascript/user-profile.js"></script>
</body>

</html>