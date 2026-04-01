<!doctype html>
<!-- A very basic webpage.
     The file extension is always ".php" for CodeIgniter views,
     even if the file only contains HTML.
-->
<html>
<head>
    <title>Student View</title>
</head>
<body>
    <!-- note how the keys from the associative array in the controller are now
         used as variable names in the view -->
    <h2>Student: <?php echo $studentName ?></h2>
    <div>
        <img src="<?php echo $studentImage ?>" />
    </div>
    <table>
        <tr>
            <td>School </td>
            <td> <?php echo $studentSchool ?></td>
        </tr>
        <tr>
            <td> Class </td>
            <td> <?php echo $studentClass ?> </td>
        </tr>
    </table>
</body>
</html>