CREATE TABLE accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('EMPLOYEE','ENGINEER','ADMIN') NOT NULL, active BOOLEAN NOT NULL
) ENGINE=InnoDB;
CREATE TABLE categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;
CREATE TABLE priorities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;
CREATE TABLE tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, title VARCHAR(255) NOT NULL,
  description VARCHAR(4000) NOT NULL, status ENUM('OPEN','IN_PROGRESS','PENDING','RESOLVED','CLOSED') NOT NULL,
  created_at TIMESTAMP(6) NOT NULL, category_id BIGINT NOT NULL, priority_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL, engineer_id BIGINT,
  FOREIGN KEY (owner_id) REFERENCES accounts(id), FOREIGN KEY (engineer_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id), FOREIGN KEY (priority_id) REFERENCES priorities(id),
  INDEX ix_ticket_owner (owner_id,id), INDEX ix_ticket_engineer (engineer_id,status,id)
) ENGINE=InnoDB;
CREATE TABLE comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, ticket_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
  text VARCHAR(4000) NOT NULL, created_at TIMESTAMP(6) NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id), FOREIGN KEY (actor_id) REFERENCES accounts(id),
  INDEX ix_comments_ticket (ticket_id,id)
) ENGINE=InnoDB;
CREATE TABLE ticket_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, ticket_id BIGINT NOT NULL, actor_id BIGINT NOT NULL,
  text VARCHAR(4000) NOT NULL, created_at TIMESTAMP(6) NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id), FOREIGN KEY (actor_id) REFERENCES accounts(id),
  INDEX ix_ticket_history_ticket (ticket_id,id)
) ENGINE=InnoDB;
