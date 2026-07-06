<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAuth
{
    /**
     * Ensure user has an active auth session.
     * Redirect to /login if not authenticated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->session()->has('auth_user')) {
            return redirect('/login');
        }

        return $next($request);
    }
}
