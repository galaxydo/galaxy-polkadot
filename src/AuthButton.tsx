import ii from "./assets/dfinity.svg"
import nfid from "./assets/nfid-logo.svg"
import { useInternetIdentity } from "@internet-identity-labs/react-ic-ii-auth"
import {
	InternetIdentityProvider,
	NFIDProvider,
	signIn,
	signOut,
	authSubscribe, User
} from "@junobuild/core";
import { useState, useEffect } from 'react';

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
	// const { signout, authenticate, isAuthenticated, identity } =
	// 	useInternetIdentity()

	const [user, setUser] = useState<User | null | undefined>(undefined);

	useEffect(() => {
		const sub = authSubscribe((user) => setUser(user));

		return () => sub();
	}, []);

	useEffect(() => {
		console.log('user', user);
		window.user = user;
	}, [user]);

	const authenticate = async () => {
		const res = await signIn({
			provider: new NFIDProvider({
				appName: "Galaxy Browser",
				logoUrl:
					"https://y7m4b-fiaaa-aaaal-acgna-cai.raw.icp0.io/logo512.png",
			}),
		});
		console.log('auth', res);
	}

	window.connect = authenticate;

	return (
		<div>
			{!user ? (
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
				}}>					<button onClick={signOut} style={{
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

