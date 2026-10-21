<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasPermissions;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, HasPermissions, HasRoles, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'locale',
        'user_name',
        'role_name',
        'status',
        'email_verified_at',
        'password',
        'password_expiry_date',
        'timezone',
        'language',
        'currency',
        'country_iso',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'enable_two_factor',
        'two_factor_expires_at',
        'is_super_admin',
        'is_publisher',
        'is_advertiser',
        'is_network',
        'title',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    public $cast = [
        'is_super_admin',
        'is_publisher',
        'is_advertiser',
        'is_network',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public $timestamps = false;

    public function generateUsername(): string
    {
        $firstInitial = strtolower(substr($this->first_name, 0, 1));
        $lastName = strtolower($this->last_name);
        $baseUsername = $firstInitial.$lastName;
        $username = $baseUsername;
        $count = 1;
        while (self::where('user_name', $username)->exists()) {
            $username = $baseUsername.$count;
            $count++;
        }

        return $username;
    }

    public function assignRoleById(int $roleId)
    {
        UserRoles::create([
            'user_id' => $this->id,
            'role_id' => $roleId,
        ]);

        return true;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    /**
     * Permission names granted through the user's roles. (Not named permissions():
     * Spatie's HasPermissions needs that to be the relation, e.g. when deleting a user.)
     */
    public function permissionNames()
    {
        return $this->roles()
            ->with('permissions')
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->pluck('name')
            ->unique()
            ->values();
    }

    public function userNetworks()
    {
        return $this->hasMany(UserNetworks::class, 'user_id');
    }

    /**
     * Network the user belongs to (null when not attached to any network).
     */
    public function networkId(): ?int
    {
        $id = $this->relationLoaded('userNetworks')
            ? $this->userNetworks->first()?->network_id
            : $this->userNetworks()->value('network_id');

        return $id === null ? null : (int) $id;
    }

    public function publisher(): HasOne
    {
        return $this->hasOne(Publisher::class, 'user_id');
    }

    public function advertiser(): HasOne
    {
        return $this->hasOne(Advertiser::class, 'user_id');
    }
}
