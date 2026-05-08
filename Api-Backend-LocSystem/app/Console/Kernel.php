<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Desbane automaticamente usuários com prazo expirado (roda a cada hora)
        $schedule->command('users:unban-expired')->hourly();

        // Invalida automaticamente sessões expiradas (roda a cada minuto)
        $schedule->command('sessions:invalidate-expired')->everyMinute();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
