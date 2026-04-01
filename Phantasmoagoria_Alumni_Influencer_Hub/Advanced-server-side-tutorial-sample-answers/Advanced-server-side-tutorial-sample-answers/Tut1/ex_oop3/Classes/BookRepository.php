<?php

class BookRepository
{
    private PDO $pdo;

    public function __construct(Database $database)
    {
        $this->pdo = $database->getConnection();
    }

    public function search($title = '', $author = '', $year = '', $price = '') {
        $conditions = [];

        if ($title !== '') {
            $conditions[] = "title = " . $this->pdo->quote($title);
        }
        if ($author !== '') {
            $conditions[] = "author = " . $this->pdo->quote($author);
        }
        if ($year !== '' && ctype_digit($year)) {
            $conditions[] = "year_of_publication = " . (int)$year;
        }
        if ($price !== '') {
            $conditions[] = "price = " . (float)$price;
        }

        if (count($conditions) === 0) {
            return [];
        }

        $where = implode(' AND ', $conditions);
        $sql = "SELECT id, title, author, year_of_publication, price FROM books WHERE {$where}";
        $result = $this->pdo->query($sql);

        $books = [];
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $books[] = $row;
        }
        return $books;
    }
}
