import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import GroupCreation from "../components/GroupCreation";

describe("GroupCreation", () =>
{
    beforeEach(() =>
    {
        global.fetch = vi.fn();
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
    });

    test("creates a group successfully", async () =>
    {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                invitationCode: "ABC123"
            })
        });

        render(<GroupCreation currentUserId={1} />);

        fireEvent.change(screen.getByLabelText("Group Name"), {
            target: { value: "  Study Group  " }
        });

        fireEvent.change(screen.getByLabelText("Description"), {
            target: { value: "  Study together  " }
        });

        fireEvent.change(screen.getByLabelText("Maximum Members"), {
            target: { value: "4" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Group" })
        );

        await waitFor(() =>
        {
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:3000/groups",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: "Study Group",
                        description: "Study together",
                        maxMembers: 4,
                        creatorId: 1
                    })
                }
            );
        });

        expect(
            await screen.findByText("Group created successfully.")
        ).toBeInTheDocument();

        expect(screen.getByText("ABC123")).toBeInTheDocument();
    });

    test("displays an error when group creation is rejected", async () =>
    {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                message: "Group creation failed."
            })
        });

        render(<GroupCreation currentUserId={1} />);

        fireEvent.change(screen.getByLabelText("Group Name"), {
            target: { value: "Study Group" }
        });

        fireEvent.change(screen.getByLabelText("Description"), {
            target: { value: "Study together" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Group" })
        );

        expect(
            await screen.findByText("Group creation failed.")
        ).toBeInTheDocument();
    });

    test("displays an error when the server cannot be reached", async () =>
    {
        fetch.mockRejectedValueOnce(new Error("Connection failed"));

        render(<GroupCreation currentUserId={1} />);

        fireEvent.change(screen.getByLabelText("Group Name"), {
            target: { value: "Study Group" }
        });

        fireEvent.change(screen.getByLabelText("Description"), {
            target: { value: "Study together" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Create Group" })
        );

        expect(
            await screen.findByText(
                "Unable to connect to the server. Please try again."
            )
        ).toBeInTheDocument();
    });
});