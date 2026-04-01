<!DOCTYPE html>
    <html>
        <head>
            <title>Calculate module mark</title>
            <!-- use bootstrap CSS framework from CDN -->
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.0.0/dist/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">

        </head>
        <body>
            <div class="container">
                <div class="row">
                    <div class="col-md-6">
                        <h2>Module mark calculation</h2>
                            <?php
                                $cw1 = filter_var($_POST["cw1"],FILTER_SANITIZE_FULL_SPECIAL_CHARS);   // filter_var sanitises the input to remove special characters
                                $cw2 = filter_var($_POST["cw2"],FILTER_SANITIZE_FULL_SPECIAL_CHARS); // Retrieve CW2 value from the submitted form
                                $modulemark = ($cw1 * 0.4) + ($cw2 * 0.6);
                            ?>
                        <div style="float:left" class="col-md-4">
                            <div> Coursework 1 mark: </div>
                            <div> Coursework 2 mark: </div>
                            <div> <strong>Module mark:</strong> </div>
                        </div>
                        <div>
                            <div> <?php echo $cw1 ?> </div>
                            <div> <?php echo $cw2 ?> </div>
                            <div> <?php echo $modulemark ?> </div>   
                        </div>
                    </div> <!-- col-md-6 --> 
                </div> <!-- row -->
                <div class="row">
                    <div class="col-md-12">
                        <a href="form.html">Return to the coursework mark form</a>
                    </div> <!-- col-md-12 -->
                </div> <!-- row -->
            </div> <!-- container -->
        </body>
    </html>