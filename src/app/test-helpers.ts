import {screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"

type User = ReturnType<typeof userEvent.setup>

// Chooses an item from a toolbar menu such as Import or Examples.
export const chooseFromMenu = async (user: User, menu: string, item: string) => {
    await user.click(screen.getByRole("button", {name: menu}))
    await user.click(await screen.findByRole("menuitem", {name: item}))
}

export const openAwkwordsDialog = async (user: User) => {
    await chooseFromMenu(user, "Import", "Awkwords…")
    return screen.findByRole("dialog", {name: "Import from Awkwords"})
}
