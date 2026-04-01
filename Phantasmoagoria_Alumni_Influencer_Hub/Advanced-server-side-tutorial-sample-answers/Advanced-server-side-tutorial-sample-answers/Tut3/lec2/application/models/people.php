<?php
defined('BASEPATH') or exit('No direct script access allowed');

class people extends CI_Model
{
    private $people = array();

    function __construct()
    {
        $this->people = array(
            array('name' => 'Taylor Swift', 'age' => 12),
            array('name' => 'Lionel Messi', 'age' => 22),
            array('name' => 'Dwayne Johnson', 'age' => 55),
            array('name' => 'Brad Pitt', 'age' => 34),
            array('name' => 'Rihanna', 'age' => 45)
        );
    }

    function addPerson($name, $age)
    {
        $this->people[] = array('name' => $name, 'age' => $age);
        return $this->people;
    }

    function findPeople($name)
    {
        $matches = array();
        foreach ($this->people as $person) {
            if (stripos($person['name'], $name) !== false) {
                $matches[] = $person;
            }
        }
        return $matches;
    }
}
