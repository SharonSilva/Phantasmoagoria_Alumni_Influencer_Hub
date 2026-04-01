CREATE TABLE cats (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  like_count    INT UNSIGNED NOT NULL DEFAULT 0,
  dislike_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Optional: sample rows (replace image_url with your own URLs if needed)
INSERT INTO cats (name, image_url, like_count, dislike_count) VALUES
('Fluffy', 'https://placekitten.com/400/400', 0, 0),
('Whiskers', 'https://placekitten.com/401/401', 0, 0),
('Shadow', 'https://placekitten.com/402/402', 0, 0),
('Mittens', 'https://placekitten.com/403/403', 0, 0),
('Luna', 'https://placekitten.com/404/404', 0, 0),
('Oreo', 'https://placekitten.com/405/405', 0, 0);

-- Table used by Catmodel::storeSession / loadSession
CREATE TABLE sessions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id    VARCHAR(128) NOT NULL,
  cat_id        INT UNSIGNED NOT NULL,
  timestamp     INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
