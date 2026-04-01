<h2>Add Movie</h2>

<style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        margin: 20px;
        color: #333;
        text-align: center;
    }

    h2 {
        color: #2c3e50;
        margin-bottom: 20px;
    }

    form {
        display: inline-block;
        background-color: #fff;
        padding: 20px 30px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        text-align: left;
        min-width: 280px;
    }

    label {
        display: block;
        font-weight: bold;
        margin: 10px 0 5px 0;
    }

    input[type="text"],
    input[type="number"] {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 14px;
        box-sizing: border-box;
    }

    .actions {
        margin-top: 15px;
        text-align: center;
    }

    input[type="submit"] {
        padding: 8px 16px;
        background-color: #27ae60;
        border: none;
        border-radius: 5px;
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    input[type="submit"]:hover {
        background-color: #1e8449;
    }

    .back-link {
        display: inline-block;
        margin-top: 16px;
        text-decoration: none;
        color: #fff;
        background-color: #2980b9;
        padding: 8px 14px;
        border-radius: 5px;
        transition: background-color 0.2s;
    }

    .back-link:hover {
        background-color: #1f5d8f;
    }

    .error {
        background-color: #fbeaea;
        border: 1px solid #f5c6c6;
        color: #b94444;
        padding: 8px 10px;
        border-radius: 5px;
        margin: 0 auto 12px auto;
        max-width: 360px;
    }
</style>

<?php if (isset($error)): ?>
    <div class="error"><?php echo $error; ?></div>
<?php endif; ?>

<form method="post" action="<?php echo site_url('Movies/create'); ?>">
    <label for="title">Title</label>
    <input type="text" id="title" name="title" required>

    <label for="director">Director</label>
    <input type="text" id="director" name="director" required>

    <label for="genre">Genre</label>
    <input type="text" id="genre" name="genre" required>

    <label for="imdb_rating">IMDB Rating</label>
    <input type="number" id="imdb_rating" name="imdb_rating" step="0.1" min="0" max="10" required>

    <label for="release_year">Release Year</label>
    <input type="number" id="release_year" name="release_year" min="1900" max="2100" required>

    <div class="actions">
        <input type="submit" value="Add Movie">
    </div>
</form>

<br>

<a class="back-link" href="<?php echo site_url('Movies'); ?>">Back</a>
