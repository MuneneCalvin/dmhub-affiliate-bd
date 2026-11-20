<?php

namespace App\Http\Controllers\Publishers;

use App\Http\Controllers\Controller;
use App\Jobs\SendUserCredentialsJob;
use App\Models\Currency;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\PublisherWorkspaceService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Str;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PublisherController extends Controller
{
    /**
     * Network owners only manage publishers of their own network; super admins manage all.
     * $column is the (qualified) network_id column of the query being scoped.
     */
    private function scopeToNetwork($query, string $column = 'publishers.network_id')
    {
        $user = Auth::user();
        if ($user->is_super_admin) {
            return $query;
        }
        $networkId = $user->networkId();

        return $networkId === null ? $query->whereRaw('1 = 0') : $query->where($column, $networkId);
    }

    /**
     * Networks offered in dropdowns: all for super admins, only their own for network owners.
     * Only the columns the UI needs are returned.
     */
    private function networkOptions()
    {
        $query = DB::table('networks')->where('status', 'A')->orderBy('id');
        $user = Auth::user();
        if (! $user->is_super_admin) {
            $query->where('id', $user->networkId() ?? 0);
        }

        return $query->get(['id', 'network_name', 'status']);
    }

    private function findManaged($id): Publisher
    {
        return $this->scopeToNetwork(Publisher::query())->findOrFail($id);
    }

    public function index(Request $request)
    {
        $pageSize = $request->get('pageSize', 10);
        $user = Auth::user();
        $query = DB::table('publishers')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->leftJoin('networks', 'networks.id', '=', 'publishers.network_id')
            ->select([
                'publishers.*',
                'users.first_name',
                'users.last_name',
                'users.email',
                'users.status',
                'users.currency',
                'users.title',
                'networks.network_name',
            ]);
        $query->where('publishers.is_verified', true);
        $this->scopeToNetwork($query);
        $query->addSelect(DB::raw("(select count(*) from publisher_campaigns where publisher_campaigns.publisher_id = publishers.id and publisher_campaigns.status = 'A') as campaigns_count"));

        // Status tiles count across every page; the list itself may be filtered.
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : 'all';
        $statusCounts = [
            'all' => (clone $query)->count(),
            'active' => (clone $query)->where('users.status', 'A')->count(),
            'inactive' => (clone $query)->where('users.status', '!=', 'A')->count(),
        ];

        $publishers = $query
            ->when($status === 'active', fn ($q) => $q->where('users.status', 'A'))
            ->when($status === 'inactive', fn ($q) => $q->where('users.status', '!=', 'A'))
            ->orderBy('publishers.id', 'desc')
            ->paginate($pageSize)
            ->withQueryString();

        return inertia('publishers/index', [
            'pbshers' => $publishers,
            'status' => $status,
            'statusCounts' => $statusCounts,
            'networks' => $this->networkOptions(),
            'extingNetwork' => $user->is_network ? UserNetworks::where('user_id', $user->id)->with('network')->first() : null,
            'currencies' => Currency::all(),
            'isSuperAdmin' => $user->is_super_admin ? true : false,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'title' => ['required', 'string', 'max:255'],
                'network_id' => ['required', 'integer', 'exists:networks,id'],
                'website_name' => ['nullable', 'url:http,https', 'max:255'],
                'payout_threshold' => ['nullable', 'numeric', 'min:0', 'max:999999999', 'decimal:0,2'],
                'currency_code' => ['required', 'string', 'max:255'],
                'coc_number' => ['nullable', 'string', 'max:10', 'unique:publishers,coc_number'],
            ]);
            $actor = Auth::user();
            if (! $actor->is_super_admin) {
                // Network owners can only create publishers inside their own network
                abort_unless($actor->networkId() === (int) $validated['network_id'], 403, 'Unauthorized action.');
            }
            DB::beginTransaction();
            $password = Str::random(64);
            $user = new User([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'title' => $validated['title'],
                'email' => $validated['email'],
                'password' => Hash::make($password),
                'is_publisher' => true,
                'status' => 'A',
                'currency' => $validated['currency_code'],
            ]);
            $user->user_name = $user->generateUsername();
            // An administrator vouches for the address; without this the account is locked out by the `verified` gate.
            $user->email_verified_at = now();
            $user->save();
            // Assign roles
            $role = DB::table('roles')->where('name', 'publisher')->first();
            if ($role) {
                $user->assignRoleById($role->id);
            }

            $publisher = Publisher::create([
                'user_id' => $user->id,
                'network_id' => $validated['network_id'],
                'website_url' => $validated['website_name'] ?? null,
                'payout_threshold' => $validated['payout_threshold'] ?? 0,
                'coc_number' => $validated['coc_number'] ?? null,
                'is_verified' => true,
            ]);

            SendUserCredentialsJob::dispatch($user)->afterCommit();
            DB::commit();

            return redirect()->route('publishers.show', $publisher->id)->with('success', 'Publisher created successfully');
        } catch (HttpExceptionInterface|ValidationException|ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()->route('publishers.index')->with(['error' => 'The publisher could not be saved.']);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $publisher = $this->scopeToNetwork(Publisher::where('user_id', $id))->firstOrFail();
            $validated = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$id],
                'title' => ['nullable', 'string', 'max:255'],
                'network_id' => ['required', 'integer', 'exists:networks,id'],
                'website_url' => ['nullable', 'url:http,https', 'max:255'],
                'payout_threshold' => ['required', 'numeric', 'min:0', 'max:999999999', 'decimal:0,2'],
                'currency' => ['required', 'string', 'max:255'],
                'coc_number' => ['nullable', 'string', 'max:10', 'unique:publishers,coc_number,'.$publisher->id],
            ]);
            DB::beginTransaction();
            $user = User::findOrFail($id);
            $user->first_name = $validated['first_name'];
            $user->last_name = $validated['last_name'];
            $user->title = $validated['title'] ?? null;
            $user->email = $validated['email'];
            $user->currency = $validated['currency'];
            $user->save();

            if (Auth::user()->is_super_admin) {
                $publisher->network_id = $validated['network_id'];
            }
            $publisher->website_url = $validated['website_url'] ?? null;
            $publisher->payout_threshold = $validated['payout_threshold'];
            $publisher->coc_number = $validated['coc_number'] ?? null;
            $publisher->save();
            DB::commit();

            return redirect()->route('publishers.show', ['id' => $publisher->id, 'tab' => 'settings'])->with('success', 'Publisher updated successfully');
        } catch (HttpExceptionInterface|ValidationException|ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()->route('publishers.index')->with(['error' => 'The publisher could not be saved.']);
        }
    }

    public function myAccount(Request $request)
    {
        abort_unless($request->user()->is_publisher, 403);
        $publisher = Publisher::where('user_id', $request->user()->id)->firstOrFail();

        return redirect()->route('publishers.show', $publisher->id);
    }

    public function show(Request $request, int $id, PublisherWorkspaceService $workspace)
    {
        $publisher = $workspace->find($request->user(), $id);
        $data = $workspace->build($publisher, $request);

        return inertia('publishers/show', [
            'publisher' => $workspace->account($publisher, $data['permissions']),
            'workspace' => $data,
            'networks' => $data['permissions']['changeNetwork'] ? $this->networkOptions() : [],
            'currencies' => $data['permissions']['edit'] ? Currency::all() : [],
        ]);
    }

    public function changeStatus($id)
    {
        try {
            $publisher = $this->findManaged($id);
            // Verification is approval, not activity: a deactivated publisher stays verified and listed.
            $newStatus = $publisher->user->status === 'A' ? 'P' : 'A';

            DB::transaction(function () use ($publisher, $newStatus) {
                if ($newStatus === 'A') {
                    $publisher->update(['is_verified' => true, 'verified_at' => $publisher->verified_at ?? now()]);
                }

                $publisher->user()->update([
                    'status' => $newStatus,
                ]);
            });

            $statusMessage = $newStatus === 'A' ? 'activated' : 'deactivated';

            return redirect()->back()->with('success', "Publisher {$statusMessage} successfully");
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not change publisher status.');
        }
    }

    public function deactivate($id)
    {
        try {
            $publisher = $this->findManaged($id);
            // Stay verified so the publisher remains in the list and can be reactivated.
            $publisher->user()->update([
                'status' => 'P',
            ]);

            return redirect()->back()->with('success', 'Publisher deactivated successfully');
        } catch (Exception $e) {
            return redirect()->route('publishers.index')->with('error', 'Could not deactivate publisher.');
        }
    }

    public function activate($id)
    {
        try {
            $publisher = $this->findManaged($id);

            DB::transaction(function () use ($publisher) {
                $publisher->update([
                    'is_verified' => true,
                    'verified_at' => now(),
                ]);

                $publisher->user()->update([
                    'status' => 'A',
                ]);
            });

            return redirect()->back()->with('success', 'Publisher activated successfully');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not activate publisher.');
        }
    }

    public function changeNetwork($id, Request $request)
    {
        try {
            if (! Auth::user()?->is_super_admin) {
                return redirect()->back()->with('error', 'Only super admins can change publisher networks.');
            }
            $publisher = Publisher::find($id);
            $validated = $request->validate([
                'network_id' => ['required', 'integer', 'exists:networks,id'],
            ]);
            $publisher->update([
                'network_id' => $validated['network_id'],
            ]);

            return redirect()->back()->with('success', 'Publisher network changed successfully');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not change publisher network.');
        }
    }
}
