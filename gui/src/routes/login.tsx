import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, FormEvent } from 'react'
import {useAuth} from "../hooks/useAuth.ts";
import LogoWhite from '/logo_black_notext.svg'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: () => {
      navigate({ to: '/' })
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(undefined)

    if (!username.trim()) {
      setError('Username is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    mutation.mutate()
  }

  return (
    <div className="flex-1 flex items-center justify-center ">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border-3 border-sunglow-500 shadow-lg p-8">
          <div className={'flex flex-col items-center justify-center'}>
            <img src={LogoWhite} alt={'logo-white'} className={'h-full w-20'}/>
            <h1 className={'font-display font-bold text-2xl mt-1'}>MetaRoboLearn</h1>
          </div>
          <p className="text-dark-neutrals-400 text-center mb-8 mt-4">Prijavi se za nastavak</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-dark-neutrals-400 mb-1">
                Korisničko ime
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-sunglow-500 transition"
                placeholder="Unesi korisničko ime"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-neutrals-400 mb-1">
                Lozinka
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-md focus:outline-none focus:border-sunglow-500 transition pr-12"
                  placeholder="Unesi lozinku"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? "Sakrij lozinku" : "Prikaži lozinku"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 bg-emerald-500 text-white font-display font-bold text-lg rounded-md hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Prijava...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}