<?php

class CheckHigherMarks
{
    public $grade;

    public function __construct($grade)
    {
        $this->grade = $grade;
    }
    public $students = array(
        array('name' => "Samwise Gamgee", 'grade' => 88),
        array('name' => "Frodo Baggins", 'grade' => 56),
        array('name' => "Elrond Half-Elven", 'grade' => 92),
        array('name' => "Gandalf Mithrandir", 'grade' => 35),
        array('name' => "Merry Brandybuck", 'grade' => 41),
        array('name' => "Pippin Took", 'grade' => 25),
        array('name' => "Legolas Greenleaf", 'grade' => 67)
    );


    public function students_scored_above()
    {
        $matches = array();
        foreach ($this->students as $s) {
            if ($s['grade'] >= $this->grade) {
                $matches[] = $s;
            }
        }
        if (count($matches) == 0) {
            return "No matching students";
        } else {
            foreach ($matches as $m) {
                return $m['name'];
            }
        }
    }
}
