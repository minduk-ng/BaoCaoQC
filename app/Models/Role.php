<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['name', 'display_name', 'description', 'allowed_customers', 'is_system'];

    protected function casts(): array
    {
        return [
            'allowed_customers' => 'array',
            'is_system' => 'boolean',
        ];
    }

    public function pages(): BelongsToMany
    {
        return $this->belongsToMany(Page::class, 'role_pages');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    /**
     * Check if this role has unrestricted customer access.
     */
    public function hasFullCustomerAccess(): bool
    {
        $customers = $this->allowed_customers ?? [];
        return in_array('*', $customers);
    }
}
