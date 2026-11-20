<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class SystemUsersController extends Controller
{
    public function index(Request $request)
    {
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : 'all';
        $users = User::query()
            ->select(['id', 'first_name', 'last_name', 'email', 'title', 'status', 'is_super_admin', 'is_network', 'is_advertiser', 'is_publisher'])
            ->with('roles:id,name')
            ->when($status === 'active', fn ($q) => $q->where('status', 'A'))
            ->when($status === 'inactive', fn ($q) => $q->where('status', '!=', 'A'))
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();
        $roles = Role::orderBy('id')->get(['id', 'name']);

        return inertia('system_managment/system_users', [
            'users' => $users,
            'status' => $status,
            'statusCounts' => [
                'all' => User::count(),
                'active' => User::where('status', 'A')->count(),
                'inactive' => User::where('status', '!=', 'A')->count(),
            ],
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
            $user->assignRoleById((int) $request->role_id);

            return redirect()->route('system.settings.users')->with('success', 'User assigned role successfully.');
        } catch (Exception $e) {
            return redirect()->route('system.settings.users')->with('error', 'An Error Ocurred'.$e->getMessage());
        }
    }
}
