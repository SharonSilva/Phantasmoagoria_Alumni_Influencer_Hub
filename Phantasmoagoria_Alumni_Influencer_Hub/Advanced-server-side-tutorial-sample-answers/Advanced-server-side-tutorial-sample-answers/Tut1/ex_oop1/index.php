<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <?php
    require_once 'Classes/Coursework.php';

    $mark1 = $_GET['mark1'];
    $mark2 = $_GET['mark2'];

    $cw1 = new Coursework($mark1);
    $cw2 = new Coursework($mark2);
    echo $cw1->calc_weight(0.4) + $cw2->calc_weight(0.6);


    ?>
</body>

</html>