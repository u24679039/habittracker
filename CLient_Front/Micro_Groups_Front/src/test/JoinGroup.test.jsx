import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import JoinGroup from "../components/JoinGroup";

describe("JoinGroup", () =>
{
    beforeEach(() =>
    {
        localStorage.setItem("token", "test-jwt-token");
    });

    beforeEach(() =>
    {
        global.fetch = vi.fn();
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
    });

    test("joins a group successfully", async () =>
    {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({})
        });

        render(
            <JoinGroup
                currentUserId={2}
                onSuccess={vi.fn()}
            />
        );

        fireEvent.change(screen.getByLabelText("Invitation Code"), {
            target: { value: "KXGW8M" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Join Group" })
        );

        await waitFor(() =>
        {
            expect(fetch).toHaveBeenCalledWith(
                "http://localhost:3000/groups/join",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer test-jwt-token"
                    },
                    body: JSON.stringify({
                        invitationCode: "KXGW8M",
                        userId: 2
                    })
                }
            );
        });

        expect(
            await screen.findByText("Group joined successfully.")
        ).toBeInTheDocument();
    });

    test("displays an error when the invitation code is rejected", async () =>
    {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                message: "Invalid invitation code."
            })
        });

        render(
            <JoinGroup
                currentUserId={1}
                onSuccess={vi.fn()}
            />
        );

        fireEvent.change(screen.getByLabelText("Invitation Code"), {
            target: { value: "KXGW8M" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Join Group" })
        );

        expect(
            await screen.findByText("Invalid invitation code.")
        ).toBeInTheDocument();
    });

    test("displays an error when the server cannot be reached", async () =>
    {
        fetch.mockRejectedValueOnce(new Error("Connection failed"));

        render(
            <JoinGroup
                currentUserId={1}
                onSuccess={vi.fn()}
            />
        );

        fireEvent.change(screen.getByLabelText("Invitation Code"), {
            target: { value: "KXGW8M" }
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Join Group" })
        );

        expect(
            await screen.findByText(
                "Unable to connect to the server. Please try again."
            )
        ).toBeInTheDocument();
    });
});