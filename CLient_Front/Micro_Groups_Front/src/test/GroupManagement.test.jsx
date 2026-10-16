import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import GroupManagement from "../components/GroupManagement";

describe("GroupManagement", () =>
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

    const members = [
        {
            userId: 1,
            name: "User One",
            role: "OWNER"
        },
        {
            userId: 2,
            name: "User Two",
            role: "MEMBER"
        }
    ];

    function mockInitialLoad()
    {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => group
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => members
            });
    }

    afterEach(() =>
    {
        vi.restoreAllMocks();
    });

    test("loads and displays the group and members", async () =>
    {
        mockInitialLoad();

        render(
            <GroupManagement
                groupId={10}
                currentUserId={1}
                onDelete={vi.fn()}
            />
        );

        expect(
            await screen.findByText("Study Group")
        ).toBeInTheDocument();

        expect(screen.getByText("User One")).toBeInTheDocument();
        expect(screen.getByText("User Two")).toBeInTheDocument();
        expect(screen.getByText("KXGW8M")).toBeInTheDocument();
    });

    test("allows the owner to update group settings", async () =>
    {
        mockInitialLoad();

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                name: "Updated Group",
                description: "Updated description",
                maxMembers: 4
            })
        });

        render(
            <GroupManagement
                groupId={10}
                currentUserId={1}
                onDelete={vi.fn()}
            />
        );

        fireEvent.click(
            await screen.findByRole("button", { name: "Edit Group" })
        );

        fireEvent.change(screen.getByLabelText("Group name"), {
            target: { value: "Updated Group" }
        });

        fireEvent.change(screen.getByLabelText("Description"), {
            target: { value: "Updated description" }
        });

        fireEvent.change(screen.getByLabelText("Maximum members"), {
            target: { value: "4" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Save Changes" })
        );

        await waitFor(() =>
        {
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:3000/groups/10",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-jwt-token"
                    },
                    body: JSON.stringify({
                        userId: 1,
                        name: "Updated Group",
                        description: "Updated description",
                        maxMembers: 4
                    })
                }
            );
        });

        expect(
            await screen.findByText("Group settings updated successfully.")
        ).toBeInTheDocument();
    });

    test("allows the owner to change a member's role", async () =>
    {
        mockInitialLoad();

        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => group
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    members[0],
                    {
                        userId: 2,
                        name: "User Two",
                        role: "OWNER"
                    }
                ]
            });

        render(
            <GroupManagement
                groupId={10}
                currentUserId={1}
                onDelete={vi.fn()}
            />
        );

        fireEvent.click(
            await screen.findByRole("button", { name: "Make owner" })
        );

        await waitFor(() =>
        {
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:3000/groups/10/members/2/role",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-jwt-token"
                    },
                    body: JSON.stringify({
                        userId: 1,
                        role: "OWNER"
                    })
                }
            );
        });

        expect(
            await screen.findByText("Role updated successfully.")
        ).toBeInTheDocument();
    });
});