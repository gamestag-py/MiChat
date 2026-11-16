-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 15, 2026 at 11:35 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `chatapp`
--

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `msg_id` int(11) NOT NULL,
  `incoming_msg_id` int(255) NOT NULL,
  `outgoing_msg_id` int(255) NOT NULL,
  `encrypted_msg` longtext DEFAULT NULL,
  `encrypted_key_sender` longtext DEFAULT NULL,
  `encrypted_key_recipient` longtext DEFAULT NULL,
  `iv` varchar(100) DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `msg` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`msg_id`, `incoming_msg_id`, `outgoing_msg_id`, `encrypted_msg`, `encrypted_key_sender`, `encrypted_key_recipient`, `iv`, `delivered_at`, `created_at`, `msg`) VALUES
(1, 293878755, 852970771, 'oNLKOIyK0rDLUJ3VsAi7sjBR', 'TqX3XVw9OrSBBWpaheORMp+PuWysULezoSwK3dIutUAMWVvHpm2BW2oQMqtGSNfrU72N2LgufZgBOyrHDWtZHZMkvwrAm+YkPu+oXhmca7F1m3g3vlFhPVExWDaGaWTHEtQhAChB0B8/uo/qAuK7DUHBy3KisxLMgtYJrZR7E9EAHX/bsuVbWckuS/nfzqz6aNhgrpW2S7krqZsKknBqo4FHUMxE4lZWLopfWilJWnxQCFZJB1IvZjU6TkKGfeI0MEqM0fDhhyvfkgOvlFgM70N4VUxROEh5GFX4MCqrK7/zscisA81Tke0IhkuF0nCL728jcjHlKGzCJ2gX1cgPm1rXONMTa27+hRV3aznrZbg8l5arpLVeMs3oUs75/RJ54PCICnBzmt2VFH7MgpflN0+B2UFlGGg1i1VbZLkAyOuyJipvTnkeBAOu0Hpz3e4W08DuxkwWueEB76jZA5qYbPbOt6Q5km0PemV7YCJyOSygZcRjXU4L6cVAK/9DCn/6', 'g8cLlbnKhCFJkpVpW8ahyZvHYxdup9HpH0Z1YVtGAzcG6LF7o5vi2hfSkuxJ6FOZ7OuJPS+j/MrBfeA5kZU9aJ4+PcRlFDmCsX6FbIYyka17IuvDIjIHDRcTr0ZuZUMF4APc1U/weqYutu7X7Sn3RH68HoRd0gqEQPrmsiPdk9mlltsIHCXnDi94cmBMCJepHY7xJm8/Ua0dnL5HfetbzuqG4oPGI1+g/s7vsir7jPandYngQg5wM0n0PVdx9coZ0BSL9m62WEzwU8irI9esZZAAJlTbYshxGVNZmhWESnxxSAUjc6sjcQ8s7iJ/U8dWw0IuISZ2TTQSutWC/lWTHxB8KADBy93daAQPwH6YXFBdlkpFRwrhIBHkEULz8WNvPLe8HS7/QycG4KGUJ0VCVRyVPYK/dzVXOEc5i+MyOkvRQ+GPZqIUiwV3oX55OyuNfOvwcwxj2r0s+qK0wwMAiLqj5hU/BlF1c8HWqLlG4b4gZvecdEdFfzOtkhwQcWSn', 'TQsex3HSpIiujqR6', NULL, '2026-11-15 16:00:37', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `unique_id` int(255) NOT NULL,
  `fname` varchar(255) NOT NULL,
  `lname` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `img` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `bio` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `unique_id`, `fname`, `lname`, `email`, `password`, `img`, `status`, `bio`) VALUES
(1, 293878755, 'Shivansh', 'A', 'shivansh@gmail.com', '4356959ca53d728221db31a3c6be0f5f', '1794738598shubhashree-image.png', 'Active now', NULL),
(2, 852970771, 'Arnavya', '1', 'arnavya@gmail.com', '20998610355fe242e1341106c15d581f', '1794738627490028-league-of-legends-porn-hentai-red-hair-katarina-du-couteau-cute-face-hair-pussy-lux-paladin-thighs.jpg', 'Active now', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_blocks`
--

CREATE TABLE `user_blocks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `blocker_id` int(11) NOT NULL,
  `blocked_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_public_keys`
--

CREATE TABLE `user_public_keys` (
  `id` int(11) NOT NULL,
  `unique_id` int(11) NOT NULL,
  `public_key` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`public_key`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_public_keys`
--

INSERT INTO `user_public_keys` (`id`, `unique_id`, `public_key`, `created_at`, `updated_at`) VALUES
(1, 293878755, '{\"alg\":\"RSA-OAEP-256\",\"e\":\"AQAB\",\"ext\":true,\"key_ops\":[\"encrypt\"],\"kty\":\"RSA\",\"n\":\"569BEoikU9CjtOzLDZj7fXV7lx9-y2GG3EBma6seoi2kPlt2PJeK4KnLaqhD4uPvccBWsAl-SI89lp-6KqH51tZ2QkSCmQ8NjVk1APj_MgtYkv9YM_zNDQVWyMmqIgwy8QAjNYKv4YCbQGwH_05JfYKZZXXxc8SNf-RUSvTXKeECf9-w_RkXSSqq6yr3BorQXoZpZ5zyKkSoH2_g4jQ8am97_5KWsy011dyQy7ZaObZ6rFOfdJ6adEfIcL0LHcNQKisUeJ9_vFcjCeRnMLPpQGG8eZ5Yr44AdxLvR6J2ClhFYnqXBejUV4x-J3co5jteYjjzJOAWFPqVKzYzhrE8RNam1NbPhiLuPxBJJcJTDdpBEu1bGwycaLUvAA8tORjqNpn_Vp7XQUeZ9muDv8OETciAdcky23NiDhKad7kQbCGRxQjgeHLgxDn2AnfbmP2ZIT4XTDiqg5M2DjNEK2dx5cP14S14IoZ6BRri1FIHUUVrQVUwgpsynQr7Fap-ucsT\"}', '2026-11-15 10:29:58', '2026-11-15 10:29:58'),
(2, 852970771, '{\"alg\":\"RSA-OAEP-256\",\"e\":\"AQAB\",\"ext\":true,\"key_ops\":[\"encrypt\"],\"kty\":\"RSA\",\"n\":\"zoje09gOP5dZP-ERGFwZTS0OExdax4lLZ9Z-Cg6EWBmuMUqF8OQFzBfGB2TVBOlxC_zg_MWv-uEv7vCi5XGmj2nBW2Z0WekgEaFh4X3aSn70XgQjFERdHCqP9yh7w8xcBmBjQmYo45OdvYNaY3gZYKd7pRtt3fX1wEhbWY8kKYvyfq5ojQrHzpBMqVXPk_M3cjAjJVdW0XfEQxwiIUb0qiX9F8PcJ9-0nH8gedDPggcDOy5n07Fx_-hL83LJqBSjD26kONF-oXX1RvfoX_Lpkhpu_Zk0gY-lu59JlJ0kTViDnEYvgEA72voh73prvIgqZiZb1dBqUnPbOEJCvdVAjH8EJQrvicXjkp_Lb7iS9-mTouXI501LHlenypsqk4k6ki4PZAtbJxjaj1RJHbTusliLlNRz-ajoiJi3Ti5aYq1rnPQ4lO-qXWp4S5xEltYBfKx-YQ-PXtfK66I2KwQpOZaZmPUJDKYDcbgFaSkcebvZuZyEl40Q0aHyKGfmOqmv\"}', '2026-11-15 10:30:28', '2026-11-15 10:30:28');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`msg_id`),
  ADD KEY `idx_messages_incoming` (`incoming_msg_id`,`msg_id`),
  ADD KEY `idx_messages_outgoing` (`outgoing_msg_id`,`msg_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_users_unique_id` (`unique_id`);

--
-- Indexes for table `user_blocks`
--
ALTER TABLE `user_blocks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_block` (`blocker_id`,`blocked_id`),
  ADD KEY `idx_blocked_id` (`blocked_id`);

--
-- Indexes for table `user_public_keys`
--
ALTER TABLE `user_public_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_key` (`unique_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `msg_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_blocks`
--
ALTER TABLE `user_blocks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_public_keys`
--
ALTER TABLE `user_public_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
