<?php

namespace App\Http\Controllers\Network;

use App\Http\Controllers\Controller;
use App\Jobs\SendUserCredentialsJob;
use App\Models\Currency;
use App\Models\Network;
use App\Models\User;
use App\Models\UserNetworks;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Throwable;

class NetworkController extends Controller
{
    public function index(Request $request)
    {
        $pageSize = $request->get('pageSize', 25);
        $status = $request->get('status');
        try {
            $query = DB::table('networks');
            if (!empty($status) && in_array($status, ['A', 'P', 'D'])) {
                $query->where('status', $status);
            }
            $networks = $query->orderBy('id', 'desc')
                ->paginate($pageSize);
            $currencies = Currency::all();
            $countries = DB::table('countries')->where('status', 'A')->get();
            return Inertia::render('networks/index', [
                'currencies' => $currencies,
                'countries' => $countries,
                'networksData' => [
                    'results' => $networks->items(),
                    'total' => $networks->total(),
                    'pageCount' => $networks->lastPage(),
                    'pageSize' => $networks->perPage(),
                    'currentPage' => $networks->currentPage(),
                    'from' => $networks->firstItem(),
                    'to' => $networks->lastItem(),
                ],
            ]);
        } catch (Exception $e) {
            return redirect()->route('networks.index')->withErrors('An Error Ocurred!!');
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'network_name' => 'required|string|max:100',
                'owner_email' => 'required|email|unique:networks,owner_email',
                'default_currency' => 'required|string|size:3',
                'default_commission_model' => 'required|string|in:P,F',
                'default_commission_value' => 'required|numeric|min:0',
                'min_payment_threshold' => 'required|numeric|min:0',
                'payment_frequency' => 'nullable|string',
                'pay_day_of_month' => 'required|integer|min:1|max:31',
                'pay_day_of_week' => 'required|integer|min:0|max:6',
                'logo_url' => 'nullable|url',
                'support_email' => 'nullable|email',
                'support_phone' => 'nullable|string|max:15',
                'country_iso' => 'nullable|string|size:3',
            ]);
            $networkId = DB::table('networks')->insertGetId([
                'network_name' => $validated['network_name'],
                'owner_email' => $validated['owner_email'],
                'default_currency' => $validated['default_currency'],
                'default_commission_model' => $validated['default_commission_model'],
                'default_commission_value' => $validated['default_commission_value'],
                'min_payment_threshold' => $validated['min_payment_threshold'],
                'payment_frequency' => $validated['payment_frequency'] ?? null,
                'pay_day_of_month' => $validated['pay_day_of_month'],
                'pay_day_of_week' => $validated['pay_day_of_week'],
                'logo_url' => $validated['logo_url'] ?? null,
                'support_email' => $validated['support_email'] ?? null,
                'support_phone' => $validated['support_phone'] ?? null,
                'country_iso' => $validated['country_iso'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
                'status' => 'A',
            ]);
            return redirect()->route('networks.show', [$networkId])->with('success', 'Network created successfully');
        } catch (Exception $e) {
            return redirect()->route('networks.index')->with('error', 'Couldnot create a network!');
        }
    }

    public function show($id)
    {
        try {
            $networks = Network::where('id', $id)
                ->join('countries', 'countries.country_iso', '=', 'networks.country_iso')
                ->first();

            if (!$networks) {
                return redirect()->route('networks.index')->with('error', 'Network not found');
            }

            $users = UserNetworks::where('network_id', $id)
                ->join('users', 'users.id', '=', 'user_networks.user_id')
                ->select('users.*')
                ->get();

            return inertia('networks/show', [
                'network' => $networks,
                'users' => $users,
            ]);
        } catch (Exception $e) {
            return redirect()->route('networks.index')->with('error', 'Failed to load network details');
        }
    }
    public function updateNetwork(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'network_name' => 'required|string|max:255',
                'owner_email' => 'required|email',
                'default_currency' => 'required|string|max:3',
                'default_commission_model' => 'required|string',
                'default_commission_value' => 'required|numeric',
                'min_payment_threshold' => 'required|numeric',
                'payment_frequency' => 'required|string',
                'pay_day_of_month' => 'nullable|integer|min:1|max:31',
                'pay_day_of_week' => 'nullable|integer|min:0|max:6',
                'logo_url' => 'nullable|string',
                'support_email' => 'nullable|email',
                'support_phone' => 'nullable|string',
                'country_iso' => 'required|string|max:3',
            ]);
            $network = Network::find($id);
            if (!$network) {
                return back()->with('error', 'Network not found');
            }
            $network->update($validated);
            return redirect()->route('networks.show', [$id])->with('success', 'Network updated successfully');
        } catch (Exception $e) {
            return back()->with('error', 'Network could not be updated');
        }
    }

    public function deactivateNetwork($id)
    {
        try {
            $network = Network::find($id);
            if (!$network) {
                return back()->with('error', 'Network not found');
            }
            $network->update(['status' => 'D']);
            return redirect()->route('networks.index')->with('success', 'Network deactivated successfully');
        } catch (Exception $e) {
            return back()->with('error', 'Network could not be deactivated');
        }
    }

    public function activateNetwork($id)
    {
        try {
            $network = Network::find($id);
            if (!$network) {
                return back()->with('error', 'Network not found');
            }
            $network->update([
                'status' => 'A',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);
            return redirect()->route('networks.index')->with('success', 'Network approved successfully');
        } catch (Exception $e) {
            return back()->with('error', 'Network could not be approved');
        }
    }

    public function createNetworkUsers(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'title' => 'required|string|max:255',
            'network_id' => 'required|numeric|exists:networks,id',
        ]);

        DB::beginTransaction();
        try {
            $password = Str::password(8);

            $user = new User([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'title' => $validated['title'],
                'email' => $validated['email'],
                'password' => Hash::make($password),
                'is_network' => true,
                'status' => 'A',
            ]);
            $user->user_name = $user->generateUsername();
            $user->save();
            
            $role = Role::where('name', 'network_owner')->first();
            if ($role) {
                $user->assignRoleById($role->id);
            }

            UserNetworks::create([
                'user_id' => $user->id,
                'network_id' => $validated['network_id'],
            ]);
            $network = Network::find($validated['network_id']);
            SendUserCredentialsJob::dispatch($user, $password, $network?->network_name);
            DB::commit();
            return redirect()
                ->route('networks.show', $validated['network_id'])
                ->with('success', 'User created successfully. Credentials sent via email.');
        } catch (Exception $e) {
            DB::rollBack();
            return redirect()
                ->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create user: ' . $e->getMessage()]);
        }
    }

    public function updateNetworkUser(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $id,
                'title' => 'required|string|max:255',
                'status' => 'required|string|in:A,D,P',
                'network_id' => 'required|numeric|exists:networks,id',
            ]);

            $user = User::find($id);
            if (!$user) {
                return back()->with('error', 'User not found');
            }

            $userNetwork = UserNetworks::where('user_id', $id)
                ->where('network_id', $validated['network_id'])
                ->first();

            if (!$userNetwork) {
                return back()->with('error', 'User does not belong to this network');
            }

            $user->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'title' => $validated['title'],
                'status' => $validated['status'],
            ]);

            return redirect()
                ->route('networks.show', $validated['network_id'])
                ->with('success', 'User updated successfully.');
        } catch (Exception $e) {
            return back()->with('error', 'Failed to update user');
        }
    }

    public function deactivateNetworkUser(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'network_id' => 'required|numeric|exists:networks,id',
            ]);

            $user = User::find($id);
            if (!$user) {
                return back()->with('error', 'User not found');
            }

            $userNetwork = UserNetworks::where('user_id', $id)
                ->where('network_id', $validated['network_id'])
                ->first();

            if (!$userNetwork) {
                return back()->with('error', 'User does not belong to this network');
            }

            $user->update(['status' => 'D']);

            return redirect()
                ->route('networks.show', $validated['network_id'])
                ->with('success', 'User deactivated successfully.');
        } catch (Exception $e) {
            return back()->with('error', 'Failed to deactivate user');
        }
    }

    public function activateNetworkUser(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'network_id' => 'required|numeric|exists:networks,id',
            ]);

            $user = User::find($id);
            if (!$user) {
                return back()->with('error', 'User not found');
            }

            $userNetwork = UserNetworks::where('user_id', $id)
                ->where('network_id', $validated['network_id'])
                ->first();

            if (!$userNetwork) {
                return back()->with('error', 'User does not belong to this network');
            }

            $user->update(['status' => 'A']);

            return redirect()
                ->route('networks.show', $validated['network_id'])
                ->with('success', 'User activated successfully.');
        } catch (Exception $e) {
            return back()->with('error', 'Failed to activate user');
        }
    }

    public function removeNetworkUser(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'network_id' => 'required|numeric|exists:networks,id',
            ]);

            $userNetwork = UserNetworks::where('user_id', $id)
                ->where('network_id', $validated['network_id'])
                ->first();

            if (!$userNetwork) {
                return back()->with('error', 'User does not belong to this network');
            }

            $userNetwork->delete();

            return redirect()
                ->route('networks.show', $validated['network_id'])
                ->with('success', 'User removed from network successfully.');
        } catch (Exception $e) {
            return back()->with('error', 'Failed to remove user from network');
        }
    }
}
