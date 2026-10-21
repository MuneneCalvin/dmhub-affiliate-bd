<?php

namespace App\Http\Controllers\Advertisers;

use App\Http\Controllers\Controller;
use App\Jobs\SendUserCredentialsJob;
use App\Models\Advertiser;
use App\Models\CampaignTerms;
use App\Models\Currency;
use App\Models\Network;
use App\Models\User;
use App\Models\UserNetworks;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;
use Str;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class AdvertiserController extends Controller
{
    /**
     * Network owners only manage advertisers of their own network; super admins manage all.
     * Works on Eloquent and query builder instances. $column is the (qualified) network_id column.
     */
    private function scopeToNetwork($query, string $column = 'advertisers.network_id')
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

    private function findManaged($id): Advertiser
    {
        return $this->scopeToNetwork(Advertiser::query())->findOrFail($id);
    }

    public function index(Request $request)
    {
        $pageSize = $request->get('pageSize', 10);
        $user = Auth::user();
        try {
            $adverts = DB::table('advertisers')
                ->select([
                    'advertisers.*',
                    'networks.network_name as networkName',
                    'networks.id as netId',
                    'currencies.currency_name as currencyName',
                    'currencies.currency_code as currencyCode',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    'users.id as userId',
                ])
                ->join('users', 'advertisers.user_id', '=', 'users.id')
                ->join('currencies', 'advertisers.currency', '=', 'currencies.currency_code')
                ->leftJoin('networks', 'advertisers.network_id', '=', 'networks.id')
                ->where('advertisers.status', 'A')
                ->where('advertisers.is_verified', true)
                ->tap(fn ($q) => $this->scopeToNetwork($q))
                ->orderByDesc('advertisers.created_at')
                ->paginate($pageSize);

            return Inertia::render('advertisers/index', [
                'advrts' => $adverts,
                'networks' => $this->networkOptions(),
                'extingNetwork' => $user->is_network ? UserNetworks::where('user_id', $user->id)->with('network')->first() : null,
                'currencies' => Currency::all(),
            ]);
        } catch (\Throwable $e) {
            return redirect()
                ->route('advertisers.index')
                ->with('error', 'Could not fetch advertisers');
        }
    }

    public function store(Request $request)
    {
        try {
            $password = Str::password(8);
            DB::beginTransaction();
            $request->validate([
                'business_name' => ['required', 'string', 'max:255'],
                'coc_number' => ['required', 'string'],
                'website_name' => ['nullable', 'string'],
                'industry' => ['required', 'string'],
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'role_name' => ['required', 'string', Rule::notIn(['super_admin', 'network_owner'])],
                'currency_code' => ['nullable', 'string'],
                'total_budget' => ['nullable', 'string'],
                'network_id' => ['nullable', 'integer', 'exists:networks,id'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            ]);
            $actor = Auth::user();
            $networkId = $actor->is_super_admin ? ($request['network_id'] ?? null) : $actor->networkId();
            abort_if($networkId === null && ! $actor->is_super_admin, 403, 'No network assigned to this user.');
            $user = new User([
                'first_name' => $request['first_name'],
                'last_name' => $request['last_name'],
                'title' => $request['role_name'],
                'email' => $request['email'],
                'password' => Hash::make($password),
                'is_advertiser' => true,
                'status' => 'A',
            ]);
            $user->user_name = $user->generateUsername();
            $user->save();

            $role = Role::where('name', $request['role_name'])->firstOrFail();
            $user->assignRoleById($role->id);

            if ($request['role_name'] === 'advertiser') {
                Advertiser::create([
                    'user_id' => $user->id,
                    'business_name' => $request['business_name'],
                    'coc_number' => $request['coc_number'],
                    'website_name' => $request['website_name'] ?? null,
                    'industry' => $request['industry'],
                    'network_id' => $networkId,
                    'currency' => $request['currency_code'] ?? null,
                    'total_budget' => $request['total_budget'] ?? 0,
                    'status' => 'A',
                    'is_verified' => true,
                ]);
            }
            SendUserCredentialsJob::dispatch($user, $password, $user?->user_name);
            DB::commit();

            return redirect()->route('advertisers.show', $user->id)->with('success', 'Advertiser created successfully');
        } catch (HttpExceptionInterface|ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            report($e);

            return redirect()->back()->with('error', 'Could not create advertiser.');
        }
    }

    public function show($id)
    {
        try {

            $columns = [
                'users.id',
                'users.first_name',
                'users.last_name',
                'users.email',
                'users.user_name',
                'users.title',
                'users.status',
                'users.currency',
                'users.country_iso',
                'users.timezone',
                'users.language',
                'advertisers.id as advertiser_id',
                'advertisers.user_id',
                'advertisers.network_id',
                'advertisers.business_name',
                'advertisers.website_name',
                'advertisers.industry',
                'advertisers.total_budget',
                'advertisers.available_budget',
                'advertisers.currency as advertiser_currency',
                'advertisers.auto_approve_publishers',
                'advertisers.require_publisher_approval',
                'advertisers.is_verified',
                'advertisers.status as advertiser_status',
                'advertisers.verified_at',
                'advertisers.created_at as advertiser_created_at',
                'advertisers.updated_at as advertiser_updated_at',
                'currencies.currency_name as currency_name',
                'currencies.currency_code as currency_code',
                'networks.network_name as network_name',
            ];

            $advertiserDetails = User::query()
                ->select($columns)
                ->join('advertisers', 'advertisers.user_id', '=', 'users.id')
                ->leftJoin('currencies', 'currencies.currency_code', '=', 'advertisers.currency')
                ->leftJoin('networks', 'advertisers.network_id', '=', 'networks.id')
                ->where('users.id', $id)
                ->tap(fn ($q) => $this->scopeToNetwork($q))
                ->first();
            abort_if($advertiserDetails === null, 404);

            return inertia('advertisers/show', [
                'advertiser' => $advertiserDetails,
                'networks' => $this->networkOptions(),
            ]);
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertisers.index')->with('error', 'An error occurred.');
        }
    }

    public function updateAdvertiser(Request $request, $id)
    {
        try {
            $advertiser = $this->findManaged($id);
            Validator::make($request->all(), [
                'business_name' => ['required', 'string', 'max:255'],
                'coc_number' => ['required', 'string'],
                'website_name' => ['nullable', 'string'],
                'industry' => ['required', 'string'],
                'network_id' => ['nullable', 'integer'],
                'currency_code' => ['nullable', 'string'],
                'total_budget' => ['nullable', 'string'],
            ])->validate();

            $advertiser->business_name = $request->input('business_name');
            $advertiser->website_name = $request->input('website_name');
            $advertiser->industry = $request->input('industry');
            if (Auth::user()->is_super_admin) {
                $advertiser->network_id = $request->input('network_id');
            }
            $advertiser->currency = $request->input('currency_code');
            $advertiser->total_budget = $request->input('total_budget');
            $advertiser->coc_number = $request->input('coc_number');
            $advertiser->save();

            return redirect()->route('advertisers.show', $advertiser->user_id)->with('success', 'Advertiser updated successfully');
        } catch (HttpExceptionInterface|ValidationException|ModelNotFoundException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->route('advertisers.index')->with('error', 'Could not update advertiser.');
        }
    }

    public function changeStatus(Request $request, $id)
    {
        try {
            $advertiser = $this->findManaged($id);
            $newStatus = $advertiser->status === 'A' ? 'P' : 'A';
            DB::transaction(function () use ($advertiser, $newStatus) {
                $advertiser->update([
                    'status' => $newStatus,
                ]);
                $advertiser->user()->update([
                    'status' => $newStatus,
                ]);
            });
            $statusMessage = $newStatus === 'A' ? 'activated' : 'deactivated';

            return redirect()->back()->with('success', "Advertiser {$statusMessage} successfully");
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not change advertiser status.');
        }
    }

    public function changeNetwork(Request $request, $id)
    {
        try {
            if (! Auth::user()?->is_super_admin) {
                return redirect()->back()->with('error', 'Only super admins can change advertiser networks.');
            }

            $advertiser = $this->findManaged($id);
            $validated = $request->validate([
                'network_id' => ['required', 'integer', 'exists:networks,id'],
            ]);
            if ((int) $advertiser->network_id === (int) $validated['network_id']) {
                return redirect()->back()->with('success', 'Advertiser already belongs to the selected network');
            }

            $advertiser->network_id = $validated['network_id'];
            $advertiser->save();

            return redirect()->back()->with('success', 'Advertiser network changed successfully');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not change advertiser network.');
        }
    }

    public function deactivate($id)
    {
        try {
            $advertiser = $this->findManaged($id);

            DB::transaction(function () use ($advertiser) {
                $advertiser->update([
                    'status' => 'P',
                    'is_verified' => false,
                ]);
                $advertiser->user()->update([
                    'status' => 'P',
                ]);
            });

            return redirect()->back()->with('success', 'Advertiser deactivated successfully');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not deactivate advertiser.');
        }
    }

    public function activate($id)
    {
        try {
            $advertiser = $this->findManaged($id);

            DB::transaction(function () use ($advertiser) {
                $advertiser->update([
                    'status' => 'A',
                ]);
                $advertiser->user()->update([
                    'status' => 'A',
                ]);
            });

            return redirect()->back()->with('success', 'Advertiser activated successfully');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Could not activate advertiser.');
        }
    }

    // terms
    public function terms()
    {
        $user = Auth::user();
        $advertiserId = $user->advertiser?->id;

        $terms = CampaignTerms::query()
            ->where(function ($query) use ($advertiserId) {
                $query->whereNull('advertiser_id');

                if ($advertiserId) {
                    $query->orWhere('advertiser_id', $advertiserId);
                }
            })
            ->paginate(10);

        return inertia('advertisercampaigns/terms/index', [
            'terms' => $terms,
        ]);
    }

    public function createTerms(Request $request)
    {
        try {
            $validated = $request->validate([
                'description' => ['required', 'string'],
            ]);
            $user = Auth::user();
            $advertiserId = $user->advertiser?->id;
            // Terms without an advertiser are platform-wide; only super admins may create them.
            abort_if($advertiserId === null && ! $user->is_super_admin, 403, 'Unauthorized action.');

            CampaignTerms::create([
                'description' => $validated['description'],
                'advertiser_id' => $advertiserId,
            ]);

            return redirect()->back()->with('success', 'Campaign terms created successfully.');
        } catch (HttpExceptionInterface|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->back()->with('error', 'Could not create terms.');
        }
    }

    public function deleteTerms(CampaignTerms $terms)
    {
        try {
            $user = Auth::user();
            $advertiserId = $user->advertiser?->id;
            $allowed = $terms->advertiser_id === null
                ? $user->is_super_admin
                : ($terms->advertiser_id === $advertiserId || $user->is_super_admin);
            abort_unless($allowed, 403, 'Unauthorized action.');
            $terms->delete();

            return redirect()
                ->back()
                ->with('success', 'Campaign term deleted successfully.');
        } catch (HttpExceptionInterface $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()->back()->with('error', 'Could not delete the term.');
        }
    }
}
