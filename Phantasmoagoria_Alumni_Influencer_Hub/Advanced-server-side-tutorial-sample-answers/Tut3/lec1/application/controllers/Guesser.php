<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * @property Guesses $guesses
 * @property CI_Input $input
 */
class Guesser extends CI_Controller {
    function __construct()
    {
        // call base class constructor
        parent::__construct();
        // Load the guesses model.  This will create a new
        // attribute object in the controller called 'guesses', which
        // can be accessed via '$this->guesses'.
        $this->load->model('guesses');
    }

    /*
     * This method loads the view that displays a picture for
     * the user to guess.  We get a new guess from the model
     * and pass this data to the guess view.
     */
    function guess()
    {
        // Use the guesses model object we loaded in the constructor to get
        // a new guess.
        $newguess = $this->guesses->guess();
        $this->load->view('guessview',$newguess);
    }

    /*
     * This method tells the user if their guess was correct.  For this,
     * we need the name the user selected and the actual 'id' of the
     * person in the picture.
     */
    function answer()
    {
        $id = $this->input->get('id');
        $guess = $this->input->get('name');
        $answer = $this->guesses->iscorrect($id,$guess);
        $this->load->view('answerview',$answer);
    }
}