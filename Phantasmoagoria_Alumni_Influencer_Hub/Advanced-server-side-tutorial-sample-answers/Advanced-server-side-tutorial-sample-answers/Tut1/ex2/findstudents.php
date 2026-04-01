<doctype! html>
    <html>
        <head>
            <title>Find students by grade</title>
            <!-- use bootstrap CSS framework from CDN -->
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
        </head>
        <body>
            <div class="container">
                <div class="row">
                    <div class="col-md-12">
                        <h2>Students with matching or higher grades</h2>
<?php
    // Retrieve the 'grade' value submitted from the HTML form
    // filter_var sanitises the input to remove special character
    $grade = filter_var($_POST["grade"],FILTER_SANITIZE_FULL_SPECIAL_CHARS);
?>
                        <p>Students whose grade is <?php echo $grade ?> or higher</p>
<?php
    // Here we're just using an array to simulate a database.  orindarily we would use
    // a database table to store the results.
    // The array is a multi-dimensional array - the inner array is an associative array with
    // keys "name" and "grade".
    $students = array(
        array('name' => "Samwise Gamgee",'grade' => 88),
        array('name' => "Frodo Baggins",'grade' => 56),
        array('name' => "Elrond Half-Elven",'grade' => 92),
        array('name' => "Gandalf Mithrandir",'grade' => 35),
        array('name' => "Merry Brandybuck",'grade' => 41),
        array('name' => "Pippin Took",'grade' => 25),
        array('name' => "Legolas Greenleaf",'grade' => 67)
    );

    $matches = array();  // Creating an empty array to store matching students
    foreach ($students as $s) {
        if ($s['grade'] >= $grade) {
            $matches[] = $s; // Add the student to the matches array
        }
    }
    if (count($matches) == 0) {
?>
        <strong>No matching students</strong> <!-- Display message if no students match -->
<?php
    }
    else {
?>
        <table>
            <tr>
                <th>Student name</th>
                <th>Grade</th>
            </tr>
<?php
        // Loop through the matched students
        foreach ($matches as $m) {
?>
            <tr>
                <td><?php echo $m['name'] ?></td>
                <td><?php echo $m['grade'] ?></td>
            </tr>
<?php
        }
?>
        </table>
<?php
    }
?>
                    
                    </div> <!-- col-md-12 --> 
                </div> <!-- row -->
                <div class="row" style="margin-top:20px">
                    <div class="col-md-12">
                        <a href="form.html">Return to the search form</a>
                    </div> <!-- col-md-12 -->
                </div> <!-- row -->
            </div> <!-- container -->
            
        </body>
    </html>