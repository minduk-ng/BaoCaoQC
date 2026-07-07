<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Page extends Model
{
    protected $fillable = ['slug', 'label', 'route_name'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_pages');
    }
}
