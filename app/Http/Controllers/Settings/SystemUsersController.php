<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserRoles;
use Exception;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class SystemUsersController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->select(['id', 'first_name', 'last_name', 'email', 'title', 'status'])
            ->orderBy('id')
            ->paginate(10);
        $roles = Role::all();

        return inertia('system_managment/system_users', [
            'users' => $users,
            'roles' => $roles,
        ]);
    }

    public function activate(User $user)
    {
        try {
            $user->update(['status' => 'A']);

            return redirect()->route('system.settings.users')->with('success', 'User activated successfully.');
        } catch (Exception $e) {
            return redirect()->route('system.settings.users')->with('error', 'An Error Ocurred'.$e->getMessage());
        }
    }

    public function deactivate(User $user)
    {
        try {
            $user->update(['status' => 'P']);

            return redirect()->route('system.settings.users')->with('success', 'User deactivated successfully.');
        } catch (Exception $e) {
            return redirect()->route('system.settings.users')->with('error', 'An Error Ocurred'.$e->getMessage());
        }
    }

    public function AssignRolesToUsers(User $user, Request $request)
    {
        try {
            $request->validate([
                'role_id' => ['required', 'exists:roles,id'],
            ]);
            UserRoles::firstOrCreate([
                'user_id' => $user->id,
                'role_id' => $request->role_id,
            ]);

            return redirect()->route('system.settings.users')->with('success', 'User assigned role successfully.');
        } catch (Exception $e) {
            return redirect()->route('system.settings.users')->with('error', 'An Error Ocurred'.$e->getMessage());
        }
    }
}
