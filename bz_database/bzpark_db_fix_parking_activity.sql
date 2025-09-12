-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: bzpark_db_fix
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `parking_activity`
--

DROP TABLE IF EXISTS `parking_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_activity` (
  `act_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `start_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end_time` timestamp NULL DEFAULT NULL,
  `duration` int GENERATED ALWAYS AS (timestampdiff(SECOND,`start_time`,`end_time`)) STORED,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `amount` decimal(6,2) NOT NULL DEFAULT '0.00',
  `is_paid` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`act_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `parking_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_activity`
--

LOCK TABLES `parking_activity` WRITE;
/*!40000 ALTER TABLE `parking_activity` DISABLE KEYS */;
INSERT INTO `parking_activity` (`act_id`, `user_id`, `start_time`, `end_time`, `created_at`, `updated_at`, `amount`, `is_paid`) VALUES (1,1,'2025-09-06 18:32:58','2025-09-07 04:05:17','2025-09-06 18:32:58','2025-09-07 04:05:17',0.00,NULL),(2,3,'2025-09-07 04:01:48','2025-09-07 04:08:32','2025-09-07 04:01:48','2025-09-07 04:08:32',0.00,NULL),(4,3,'2025-09-08 17:07:00','2025-09-08 21:07:00','2025-09-08 17:07:00','2025-09-08 17:11:34',30.00,NULL),(5,4,'2025-09-09 11:20:00','2025-09-10 14:17:00','2025-09-09 11:20:00','2025-09-10 14:17:13',145.00,NULL);
/*!40000 ALTER TABLE `parking_activity` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-10 22:59:55
