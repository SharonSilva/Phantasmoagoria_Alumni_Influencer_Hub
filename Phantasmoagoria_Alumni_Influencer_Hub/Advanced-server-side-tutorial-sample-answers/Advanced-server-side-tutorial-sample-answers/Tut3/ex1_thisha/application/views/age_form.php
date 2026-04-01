<!DOCTYPE html>
<html>

<head>
    <title>Calculate Age</title>
</head>

<body>

    <h2>Enter Your Date of Birth</h2>

    <form method="post" action="<?php echo site_url('age/calculate'); ?>">
        <label for="dob">Date of Birth:</label><br><br>
        <input type="date" name="dob" id="dob" required><br><br>
        <input type="submit" value="Calculate Age">
    </form>

</body>

</html>