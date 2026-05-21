<?php

namespace App\Http\Services\EmailService;

use PHPMailer\PHPMailer\PHPMailer;  
use App\Http\Services\LogsService\LogsService;

class EmailService
{
    protected $mail;
    protected $logsService;

    // Método Construtor
    public function __construct(LogsService $logsService) {

        $this->logsService = $logsService;
        $this->mail = new PHPMailer(true);
        $this->mail->setLanguage('br');
        $this->mail->CharSet = 'UTF-8';  
        $this->configureMail();

    }

    
    // Método para configurar as propriedades do PHPMailer, definindo o host, autenticação, credenciais e outras configurações necessárias para o envio de e-mails utilizando o protocolo SMTP.
    private function configureMail(): void {

        $this->mail->isSMTP();                                   
        $this->mail->Host = config('mail.mailers.smtp.host');  
        $this->mail->SMTPAuth = true;                               
        $this->mail->Username = config('mail.mailers.smtp.username');                
        $this->mail->Password = config('mail.mailers.smtp.password');                
        $this->mail->SMTPSecure = config('mail.mailers.smtp.encryption', null);     
        $this->mail->Port = config('mail.mailers.smtp.port', 1025);   
            
    }


    // Método para enviar um e-mail, configurando os destinatários, assunto, corpo do e-mail e outras propriedades relevantes, e registrando um log da ação de envio de e-mail com as informações correspondentes.
    public function sendEmail($to, $subject, $body, $from): void {     
        
        $this->mail->setFrom($from ?? env('MAIL_FROM_ADDRESS'), env('MAIL_FROM_NAME'));
        $this->mail->addAddress($to);
        $this->mail->isHTML(true); 
        $this->mail->Subject = $subject;
        $this->mail->Body = $body;
        $this->mail->AltBody = strip_tags($body); 

        $this->mail->send();

        $this->logsService->createLog(
            auth()->id(),
            'send_email',
            [
                'to'      => $to,
                'subject' => $subject,
                'from'    => $from ?? env('MAIL_FROM_ADDRESS'),
            ],
            'E-mail enviado com sucesso'
        );
   
    }

}