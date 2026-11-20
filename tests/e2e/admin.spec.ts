import { expect, test } from '@playwright/test';
import { as, loginWith, seeded, state } from './helpers';

const roleName = 'E2E Settings manager';

test('super admin creates a role, assigns it and the user sees the menu item', async ({
    browser,
    page: staffPage,
}) => {
    const page = await as(browser, 'admin');
    await page.goto('/system/settings/role');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Roles & permissions' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'New role' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Role name').fill(roleName);
    await dialog
        .getByRole('checkbox', { name: 'Open the network dashboard' })
        .check();
    await dialog.getByRole('checkbox', { name: 'Network settings' }).check();
    await expect(dialog.getByText('2 selected')).toBeVisible();
    await dialog.getByRole('button', { name: 'Create role' }).click();
    await expect(dialog).toBeHidden();

    const card = page
        .getByRole('region', { name: 'Roles' })
        .getByRole('button', { name: new RegExp(roleName) });
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(card).toContainText('0 users · 2 permissions');
    const panel = page.getByRole('region', { name: roleName });
    await expect(
        panel.getByRole('group', { name: 'Administration' }),
    ).toContainText(/2 of \d+ on/);

    // Assign the role from the system users directory (10 users per page).
    const users = state().users;
    const index = users.findIndex((u) => u.email === seeded.staffUser);
    await page.goto(
        `/system/settings/users?page=${Math.floor(index / 10) + 1}`,
    );
    await page
        .getByRole('button', { name: 'More actions for E2E Staff' })
        .click();
    await page.getByRole('menuitem', { name: 'Assign roles' }).click();
    const assign = page.getByRole('dialog');
    await assign.getByRole('radio', { name: roleName }).check();
    await assign.getByRole('button', { name: 'Assign role' }).click();
    await expect(assign).toBeHidden();

    await loginWith(staffPage, seeded.staffUser);
    const menu = staffPage.getByRole('navigation', {
        name: 'Main navigation',
    });
    await expect(
        menu.getByRole('link', { name: 'Network settings' }),
    ).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Fraud rules' })).toHaveCount(
        0,
    );
});

test('super admin tunes a fraud rule, previews, saves and restores a version', async ({
    browser,
}) => {
    const page = await as(browser, 'admin');
    await page.goto('/finance/fraud');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Fraud rules' }),
    ).toBeVisible();

    const rule = page.getByRole('article', {
        name: 'Click-to-conversion timing',
    });
    await expect(
        rule.getByRole('switch', { name: 'Click-to-conversion timing' }),
    ).toHaveAttribute('aria-checked', 'true');

    const setThreshold = async (seconds: string, reason: string) => {
        if (
            !(await rule
                .getByLabel('Minimum time from click to conversion')
                .isVisible())
        ) {
            await rule
                .getByRole('button', {
                    name: /Adjust Click-to-conversion timing/,
                })
                .click();
        }
        await rule
            .getByLabel('Minimum time from click to conversion')
            .fill(seconds);
        await expect(rule).toContainText(`${seconds} s`);
        const preview = page.getByRole('region', { name: 'Preview results' });
        await preview.getByRole('button', { name: 'Run preview' }).click();
        await expect(preview.getByText('Assessments compared')).toBeVisible();
        await preview.getByLabel('Reason for policy change').fill(reason);
        await preview
            .getByRole('button', { name: 'Save as new version' })
            .click();
    };

    await setThreshold('3', 'E2E: stricter timing');
    const history = page.getByRole('region', { name: 'Policy history' });
    await expect(history).toContainText('E2E: stricter timing');

    await setThreshold('4', 'E2E: relax timing');
    await expect(history.getByRole('listitem').first()).toContainText(
        'E2E: relax timing',
    );
    await expect(rule).toContainText('4 s');

    // Restore the first saved version (reason required).
    const older = history
        .getByRole('listitem')
        .filter({ hasText: 'E2E: stricter timing' });
    await older.getByRole('button', { name: /^Restore version/ }).click();
    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', {
        name: 'Restore as new version',
    });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Reason for restoring').fill('E2E: back to 3s');
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect(history.getByRole('listitem').first()).toContainText(
        'E2E: back to 3s',
    );
    await expect(rule).toContainText('3 s');
});
