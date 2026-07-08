<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'avatar', 'google_id', 'last_login_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function userRole(): HasOne
    {
        return $this->hasOne(UserRole::class);
    }

    /**
     * Get the user's role (through user_roles pivot).
     */
    public function role(): ?Role
    {
        return $this->userRole?->role;
    }

    /**
     * Get allowed page slugs for this user.
     */
    public function allowedPageSlugs(): array
    {
        $role = $this->role();
        if (!$role) return [];
        return $role->pages()->pluck('slug')->toArray();
    }

    /**
     * Get allowed customers for this user.
     */
    public function allowedCustomers(): array
    {
        $role = $this->role();
        if (!$role) return [];
        return $role->allowed_customers ?? [];
    }
}
