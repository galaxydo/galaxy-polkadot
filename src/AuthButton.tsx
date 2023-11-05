import ii from "./assets/dfinity.svg"
import nfid from "./assets/nfid-logo.svg"
import { useInternetIdentity } from "@internet-identity-labs/react-ic-ii-auth"

const ProvidersLogos: { [key: string]: string } = {
	NFID: nfid,
	II: ii,
}

interface IAuthButton {
	provider: string
	label?: string
	reset: () => void
}

export const AuthButton = ({ provider, label, reset }: IAuthButton) => {
	const { signout, authenticate, isAuthenticated, identity } =
		useInternetIdentity()

	const signOut = () => {
		signout()
		reset()
	}

	return (
		<div>
			{!isAuthenticated ? (
				<button onClick={authenticate} className="auth-button">
					Sign in with{label ? ` (${label})` : ""}
					<img src={ProvidersLogos[provider]} alt="" />
				</button>
			) : (
				<div style={{
					color: '#F5F5F5',
					backgroundColor: '#222',
					padding: '20px',
					borderRadius: '10px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					margin: '10px'
				}}>
					<span style={{
						fontSize: '18px',
						fontWeight: 'bold'
					}}>
						Signed in as: {identity?.getPrincipal().toText()}
					</span>

					<button onClick={signOut} style={{
						backgroundColor: '#F5F5F5',
						color: '#000',
						padding: '10px 20px',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer'
					}}>
						Sign out
					</button>
				</div>
			)}
		</div>
	)
}

