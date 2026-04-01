<h2>Search Results</h2>

<style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        margin: 20px;
        color: #333;
    }

    h2 {
        color: #2c3e50;
        text-align: center;
        margin-bottom: 30px;
    }

    .movie {
        background-color: #fff;
        padding: 15px 20px;
        margin-bottom: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    }

    .movie:hover {
        transform: scale(1.02);
    }

    .movie strong {
        color: #2980b9;
    }

    hr {
        border: none;
        border-top: 1px solid #ddd;
        margin: 10px 0;
    }

    a {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 15px;
        text-decoration: none;
        color: #fff;
        background-color: #2980b9;
        border-radius: 5px;
        transition: background-color 0.2s;
    }

    a:hover {
        background-color: #1f5d8f;
    }

    p {
        margin: 5px 0;
    }
</style>

<?php if($movies == false): ?>
    <p>No movies found.</p>
<?php else: ?>

    <?php foreach($movies as $movie): ?>
        <div class="movie">
            <p><strong>Title:</strong> <?php echo $movie->title; ?></p>
            <p><strong>Director:</strong> <?php echo $movie->director; ?></p>
            <p><strong>Genre:</strong> <?php echo $movie->genre; ?></p>
            <p><strong>IMDB Rating:</strong> <?php echo $movie->imdb_rating; ?></p>
            <p><strong>Release Year:</strong> <?php echo $movie->release_year; ?></p>
        </div>
    <?php endforeach; ?>

<?php endif; ?>

<a href="<?php echo site_url('Movies'); ?>">Back</a>
