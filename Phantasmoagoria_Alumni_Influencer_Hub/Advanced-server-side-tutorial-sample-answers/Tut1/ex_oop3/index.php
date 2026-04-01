<?php

require_once './Classes/Database.php';
require_once './Classes/BookRepository.php';

// --- Controller logic ---
$isSubmitted = $_SERVER['REQUEST_METHOD'] === 'POST';
$books = [];
$error = null;

if ($isSubmitted) {
    $title = trim(filter_var($_POST['title'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS));
    $author = trim(filter_var($_POST['author'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS));
    $year = trim($_POST['year'] ?? '');
    $price = trim($_POST['price'] ?? '');

    if ($title === '' && $author === '' && $year === '' && $price === '') {
        $error = 'Please enter at least one search criterion (title, author, year, or price).';
    } else {
        try {
            $database = new Database('localhost', 'tut1', 'root', '');
            $repository = new BookRepository($database);
            $books = $repository->search($title, $author, $year, $price);
        } catch (PDOException $e) {
            $error = 'Database error: ' . htmlspecialchars($e->getMessage());
        }
    }
}

// --- View ---
?>
<!DOCTYPE html>
<html>
<head>
    <title>Find book</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
</head>
<body>
    <div class="container">
        <div class="row">
            <div class="col-md-12">
                <h2>Find book</h2>
                <p>Enter at least one of: title, author, year of publication, and price.</p>

                <form method="POST" action="">
                    <div class="form-group col-md-6">
                        <label for="title">Title</label>
                        <input type="text" class="form-control" id="title" name="title" placeholder="Enter book title">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="author">Author</label>
                        <input type="text" class="form-control" id="author" name="author" placeholder="Enter author">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="year">Year of publication</label>
                        <input type="text" class="form-control" id="year" name="year" placeholder="Enter year of publication">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="price">Price</label>
                        <input type="text" class="form-control" id="price" name="price" placeholder="Enter price (e.g. 19.99)">
                    </div>
                    <button type="submit" class="btn btn-primary">Submit</button>
                </form>

                <?php if ($error !== null): ?>
                    <div class="alert alert-danger mt-3"><?php echo $error; ?></div>
                <?php endif; ?>

                <?php if ($isSubmitted && $error === null): ?>
                    <h4 class="mt-4">Results</h4>
                    <?php if (count($books) === 0): ?>
                        <p>No matching books found.</p>
                    <?php else: ?>
                        <table class="table table-bordered mt-2">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Year of publication</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($books as $row): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($row['title'] ?? ''); ?></td>
                                        <td><?php echo htmlspecialchars($row['author'] ?? ''); ?></td>
                                        <td><?php echo htmlspecialchars($row['year_of_publication'] ?? ''); ?></td>
                                        <td><?php echo htmlspecialchars($row['price'] ?? ''); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                    <p class="mt-3"><a href="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>">Click here to search again</a></p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>
