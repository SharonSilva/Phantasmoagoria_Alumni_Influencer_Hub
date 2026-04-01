<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <?php
    require_once 'Classes/CheckHigherMarks.php';

    $mark = $_GET['mark'];

    $obj1= new CheckHigherMarks($mark);

    echo $obj1->students_scored_above();


    ?>
</body>

</html>



