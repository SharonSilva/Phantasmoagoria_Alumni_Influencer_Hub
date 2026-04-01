<!doctype html>
<?php
    // we don't always want to display the right name and wrong
    // name in the same order, so randomly mix them up
    $choice = rand(0,1);
    if ($choice == 1) {
        // display correct name last
        $name1 = $wrongname;
        $name2 = $name;
    }
    else {
        $name1 = $name;
        $name2 = $wrongname;
    }

?>
<html>
<head>
	<link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="padding:20px">

			<div>
                <!--
                    Display the image using the image url sent back by the model.
                -->
				<img src="<?php echo $image ?>" width=400>
			</div> <!-- div/img -->
			<div>
				<p>Who is this?
				<form class="form" method="get" action="<?php echo site_url('guesser/answer'); ?>">
                    <!--
                        The id (i.e., the array index from the model) of the correct person
                        is made a hidden input field.  The user won't see it but this means
                        it is passed back to the controller when the user makes their guess -
                        this allows the application to work out if the user guessed correctly.
                    -->
					<input type=hidden name=id value="<?php echo $id ?>">
					<div class="radio">
					  <label>
					    <input type="radio" name="name" value="<?php echo $name1 ?>">
					    <?php echo $name1 ?>
					  </label>
					</div>
					<div class="radio">
					  <label>
					    <input type="radio" name="name" value="<?php echo $name2 ?>">
					    <?php echo $name2 ?>
					  </label>
					</div>
					<div>
						<input type=submit value="Guess who it is!">
					</div>
				</form>
				
			</div>
	</div>

	
</body>
</html>