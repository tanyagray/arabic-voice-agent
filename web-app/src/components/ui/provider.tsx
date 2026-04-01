import { ChakraProvider } from "@chakra-ui/react"
import {
    Toaster,
    Toast,
    createToaster,
} from "@chakra-ui/react"
import { system } from "../../theme"

export const toaster = createToaster({
    placement: "top",
    pauseOnPageIdle: true,
})

export function Provider(props: { children: React.ReactNode }) {
    return (
        <ChakraProvider value={system}>
            {props.children}
            <Toaster toaster={toaster}>
                {(toast) => (
                    <Toast.Root>
                        <Toast.Title>{toast.title}</Toast.Title>
                        <Toast.Description>{toast.description}</Toast.Description>
                        <Toast.CloseTrigger />
                    </Toast.Root>
                )}
            </Toaster>
        </ChakraProvider>
    )
}
