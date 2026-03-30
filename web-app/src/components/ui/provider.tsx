import { ChakraProvider } from "@chakra-ui/react"
import { Toaster } from "@chakra-ui/react"
import { toaster } from "@/lib/toaster"
import { system } from "../../theme"

export function Provider(props: { children: React.ReactNode }) {
    return (
        <ChakraProvider value={system}>
            {props.children}
            <Toaster toaster={toaster} />
        </ChakraProvider>
    )
}
