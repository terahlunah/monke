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

// Toggles an item of the output panel's view settings menu, which stays open after a toggle, then closes it.
export const toggleViewSetting = async (user: User, name: string) => {
    await user.click(screen.getByRole("button", {name: "View settings"}))
    await user.click(await screen.findByRole("menuitemcheckbox", {name}))
    await user.keyboard("{Escape}")
}
