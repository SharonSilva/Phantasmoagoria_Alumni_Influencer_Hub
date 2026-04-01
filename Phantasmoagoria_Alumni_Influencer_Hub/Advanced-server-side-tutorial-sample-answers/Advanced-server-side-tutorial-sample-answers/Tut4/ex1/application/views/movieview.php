<h2>Search Movies by Genre</h2>

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
        margin-bottom: 30px;
    }

    form {
        display: inline-block;
        background-color: #fff;
        padding: 20px 30px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    input[type="text"] {
        padding: 8px 12px;
        margin-right: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 14px;
    }

    input[type="submit"] {
        padding: 8px 16px;
        background-color: #2980b9;
        border: none;
        border-radius: 5px;
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    input[type="submit"]:hover {
        background-color: #1f5d8f;
    }

    .view-all {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        text-decoration: none;
        color: #fff;
        background-color: #27ae60;
        border-radius: 5px;
        transition: background-color 0.2s;
    }

    .view-all:hover {
        background-color: #1e8449;
    }

    .add-movie {
        display: inline-block;
        margin-top: 12px;
        padding: 10px 20px;
        text-decoration: none;
        color: #fff;
        background-color: #8e44ad;
        border-radius: 5px;
        transition: background-color 0.2s;
    }

    .add-movie:hover {
        background-color: #6c3483;
    }
</style>

<form method="post" action="<?php echo site_url('Movies/search'); ?>">
    <input type="text" name="genre" placeholder="Enter Genre">
    <input type="submit" value="Search">
</form>

<br>

<a class="view-all" href="<?php echo site_url('Movies/allmovies'); ?>">
    View All Movies
</a>

<br>

<a class="add-movie" href="<?php echo site_url('Movies/add'); ?>">
    Add Movie
</a>