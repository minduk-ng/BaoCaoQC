<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('page_id')->constrained('pages')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['role_id', 'page_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_pages');
    }
};
