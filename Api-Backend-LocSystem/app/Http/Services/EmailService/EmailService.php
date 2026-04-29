<?php

namespace App\Http\Services\EmailService;

use PHPMailer\PHPMailer\PHPMailer;  

class EmailService
{
    protected $mail;

    public function __construct () {

        $this->mail = new PHPMailer(true);
        $this->mail->setLanguage('br');
        $this->mail->CharSet = 'UTF-8';  
        $this->configureMail();

    }

    
    private function configureMail (): void {

        $this->mail->isSMTP();                                   
        $this->mail->Host = config('mail.mailers.smtp.host');  
        $this->mail->SMTPAuth = true;                               
        $this->mail->Username = config('mail.mailers.smtp.username');                
        $this->mail->Password = config('mail.mailers.smtp.password');                
        $this->mail->SMTPSecure = config('mail.mailers.smtp.encryption', null);     
        $this->mail->Port = config('mail.mailers.smtp.port', 1025);   
            
    }


    public function sendEmail ($to, $subject, $body, $from): void {     
        
        $this->mail->setFrom($from ?? env('MAIL_FROM_ADDRESS'), env('MAIL_FROM_NAME'));
        $this->mail->addAddress($to);
        $this->mail->isHTML(true); 
        $this->mail->Subject = $subject;
        $this->mail->Body = $body;
        $this->mail->AltBody = strip_tags($body); 

        $this->mail->send();
   
    }

}