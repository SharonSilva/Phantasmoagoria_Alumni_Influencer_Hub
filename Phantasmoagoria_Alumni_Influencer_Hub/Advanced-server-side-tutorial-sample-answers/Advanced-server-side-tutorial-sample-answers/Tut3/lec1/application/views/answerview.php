<!doctype html>
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
            <?php
                if ($iscorrect === true) {
					// they guess correctly
			?>
				    <h2 class="bg-success">
						Correct!  It's <?php echo $name ?>!
					</h2>
			<?php
				}
				else {
					// they guessed wrongly
			?>
				<h2 class="bg-warning">
					Wrong!  It's not <?php echo $name ?>!
				</h2>
			<?php
				}
			?>
			<a href="<?php echo site_url('guesser/guess'); ?>"><button class="btn btn-primary btn-sm">Next</button></a>
				
			</div>
	</div>

	
</body>
</html>