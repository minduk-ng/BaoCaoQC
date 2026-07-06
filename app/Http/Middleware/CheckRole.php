<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Check if the authenticated user's role is in the allowed list.
     * Usage in routes: ->middleware('check.role:admin,viewer')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->session()->get('auth_user');

        if (!$user || !in_array($user['role'], $roles, true)) {
            return redirect('/unauthorized');
        }

        return $next($request);
    }
}
