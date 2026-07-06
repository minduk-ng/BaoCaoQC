<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Role-Based Access Control
    |--------------------------------------------------------------------------
    |
    | Map Google email addresses to roles. Emails not listed here
    | are automatically assigned the 'guest' role.
    |
    | admin  - Full access: Report, Top QC, Compare, customer details, Excel export
    | viewer - Limited access: Report only (no customer detail expand), Excel export
    | guest  - No access: sees "unauthorized" page with contact admin message
    |
    */

    'roles' => [
        'admin' => [
            'minhducqwe0123@gmail.com'
            // 'your-admin@gmail.com',
        ],
        'viewer' => [
            'ngminhduc05.ds@gmail.com'
            // 'your-viewer@gmail.com',
        ],
    ],
];
