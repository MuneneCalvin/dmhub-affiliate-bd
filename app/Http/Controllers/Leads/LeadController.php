<?php

namespace App\Http\Controllers\Leads;

use App\Exports\LeadsExport;
use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Lead;
use App\Models\User;
use App\Models\UserNetworks;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class LeadController extends Controller
{
    /**
     * Publishers can view their own leads but never work or delete them.
     */
    private function authorizeCrm(): void
    {
        $user = auth()->user();
        abort_if(! $user->is_super_admin && ! $user->is_network && ! $user->is_advertiser, 403, 'Unauthorized');
    }

    private function findVisible($id): Lead
    {
        return Lead::visibleTo(auth()->user())->findOrFail($id);
    }

    /**
     * Users a lead may be assigned to: the caller, plus their network colleagues.
     */
    private function assignableUsers(User $user)
    {
        $query = User::query()->select('id', 'user_name');

        if ($user->is_super_admin) {
            return $query;
        }

        $networkId = $user->is_network ? $user->networkId() : null;

        return $query->where(function ($q) use ($user, $networkId) {
            $q->where('users.id', $user->id);
            if ($networkId !== null) {
                $q->orWhereIn('users.id', UserNetworks::where('network_id', $networkId)->select('user_id'));
            }
        });
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Lead::visibleTo($user)->with(['campaign', 'publisher', 'offer', 'creative', 'assignedUser']);
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->campaign_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $leads = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();
        $counts = Lead::visibleTo($user)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');
        $stats = [
            'total' => (int) $counts->sum(),
            'new' => (int) ($counts['new'] ?? 0),
            'contacted' => (int) ($counts['contacted'] ?? 0),
            'qualified' => (int) ($counts['qualified'] ?? 0),
            'converted' => (int) ($counts['converted'] ?? 0),
        ];
        $campaigns = $user->is_publisher && ! $user->is_network && ! $user->is_advertiser && ! $user->is_super_admin
            ? Campaign::whereIn('id', Lead::visibleTo($user)->select('campaign_id'))->select('id', 'name')->get()
            : Campaign::visibleTo($user)->select('id', 'name')->get();

        $teamMembers = $this->assignableUsers($user)->get();

        return Inertia::render('leads/index', [
            'leads' => $leads,
            'stats' => $stats,
            'campaigns' => $campaigns,
            'teamMembers' => $teamMembers,
            'filters' => $request->only(['search', 'status', 'priority', 'campaign_id', 'date_from', 'date_to']),
        ]);
    }

    public function show($id)
    {
        $lead = Lead::visibleTo(auth()->user())->with([
            'campaign',
            'publisher',
            'offer',
            'creative',
            'assignedUser',
            'click',
            'network',
        ])->findOrFail($id);

        return Inertia::render('leads/show', [
            'lead' => $lead,
        ]);
    }

    public function update(Request $request, $id)
    {
        $this->authorizeCrm();
        $lead = $this->findVisible($id);

        $validated = $request->validate([
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'job_title' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'status' => 'nullable|in:new,contacted,qualified,converted,lost,unresponsive',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'notes' => 'nullable|string',
            'lead_value' => 'nullable|numeric|min:0',
            'lead_score' => 'nullable|integer|min:0|max:100',
            'assigned_to' => ['nullable', Rule::in($this->assignableUsers($request->user())->pluck('id')->all())],
            'next_follow_up_at' => 'nullable|date',
        ]);

        $lead->update($validated);

        return back()->with('success', 'Lead updated successfully');
    }

    public function updateStatus(Request $request, $id)
    {
        $this->authorizeCrm();
        $lead = $this->findVisible($id);

        $validated = $request->validate([
            'status' => 'required|in:new,contacted,qualified,converted,lost,unresponsive',
        ]);

        $lead->update($validated);

        if ($validated['status'] === 'contacted') {
            $lead->update([
                'last_contacted_at' => now(),
                'contact_attempts' => $lead->contact_attempts + 1,
            ]);
        }

        if ($validated['status'] === 'converted') {
            $lead->update([
                'is_converted' => true,
                'converted_at' => now(),
            ]);
        }

        return back()->with('success', 'Lead status updated');
    }

    public function assign(Request $request, $id)
    {
        $this->authorizeCrm();
        $lead = $this->findVisible($id);

        $validated = $request->validate([
            'assigned_to' => ['required', Rule::in($this->assignableUsers($request->user())->pluck('id')->all())],
        ]);

        $lead->update($validated);

        return back()->with('success', 'Lead assigned successfully');
    }

    public function addNote(Request $request, $id)
    {
        $this->authorizeCrm();
        $lead = $this->findVisible($id);

        $validated = $request->validate([
            'note' => 'required|string',
        ]);

        $existingNotes = $lead->notes ?? '';
        $timestamp = now()->format('Y-m-d H:i');
        $userName = trim(auth()->user()->first_name.' '.auth()->user()->last_name);
        $newNote = "[{$timestamp}] {$userName}: {$validated['note']}";

        $lead->update([
            'notes' => $existingNotes ? "{$existingNotes}\n\n{$newNote}" : $newNote,
        ]);

        return back()->with('success', 'Note added successfully');
    }

    public function destroy($id)
    {
        $this->authorizeCrm();
        $lead = $this->findVisible($id);
        $lead->delete();

        return redirect()->route('advertiser.leads.index')->with('success', 'Lead deleted successfully');
    }

    public function export(Request $request)
    {
        $filename = 'leads-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(
            new LeadsExport(
                $request->user(),
                $request->filled('status') ? $request->status : null,
                $request->filled('campaign_id') ? $request->campaign_id : null
            ),
            $filename
        );
    }
}
