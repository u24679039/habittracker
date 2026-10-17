import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import Groups from "../components/Groups";

describe("Groups", () =>
{
    beforeEach(() =>
    {
        localStorage.setItem("token", "test-jwt-token");
    });

    const group = {
        groupId: 10,
        name: "Study Group",
        description: "Study together",
        invitationCode: "KXGW8M",
        maxMembers: 5
    };

    afterEach(() =>
    {
        vi.restoreAllMocks();
    });

    test("loads and displays the user's group", async () =>
    {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ group }]
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        userId: 1,
                        name: "User One",
                        role: "OWNER"
                    }
                ]
            });

        render(
            <Groups
                currentUserId={1}
                onManageGroup={vi.fn()}
                onCreateGroup={vi.fn()}
                onJoinGroup={vi.fn()}
            />
        );

        expect(
            await screen.findByText("Study Group")
        ).toBeInTheDocument();

        expect(screen.getByText("You")).toBeInTheDocument();
        expect(screen.getByText("OWNER")).toBeInTheDocument();
    });

    test("shows the correct action for owner and member", async () =>
    {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ group }]
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        userId: 2,
                        name: "User Two",
                        role: "MEMBER"
                    }
                ]
            });

        render(
            <Groups
                currentUserId={2}
                onManageGroup={vi.fn()}
                onCreateGroup={vi.fn()}
                onJoinGroup={vi.fn()}
            />
        );

        expect(
            await screen.findByRole("button", { name: /Leave/ })
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: "Manage Group" })
        ).not.toBeInTheDocument();
    });

    test("allows a member to leave a group", async () =>
    {
        global.fetch = vi.fn()
            // Initial groups request
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{ group }]
            })
            // Initial members request
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        userId: 2,
                        name: "User Two",
                        role: "MEMBER"
                    }
                ]
            })
            // Leave request
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            })
            // Reload groups after leaving
            .mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

        render(
            <Groups
                currentUserId={2}
                onManageGroup={vi.fn()}
                onCreateGroup={vi.fn()}
                onJoinGroup={vi.fn()}
            />
        );

        const leaveButton =
            await screen.findByRole("button", { name: /Leave/ });

        fireEvent.click(leaveButton);

        expect(
            screen.getByText(
                "Are you sure you want to leave this group?"
            )
        ).toBeInTheDocument();

        const confirmButtons =
            screen.getAllByRole("button", { name: "Leave" });

        fireEvent.click(confirmButtons[confirmButtons.length - 1]);

        await waitFor(() =>
        {
            expect(fetch).toHaveBeenCalledWith(
                "/api/groups/10/leave",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-jwt-token"
                    },
                    body: JSON.stringify({
                        userId: 2
                    })
                }
            );
        });
    });
});