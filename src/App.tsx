import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppLayout } from './components/layout/AppLayout'
import Home from './pages/Home'

const Topic01  = lazy(() => import('./pages/topic01-overview'))
const Topic02  = lazy(() => import('./pages/topic02-scheduler'))
const Topic03  = lazy(() => import('./pages/topic03-memory'))
const Topic04  = lazy(() => import('./pages/topic04-filesystem'))
const Topic05  = lazy(() => import('./pages/topic05-interrupts'))
const Topic06  = lazy(() => import('./pages/topic06-network-stack'))
const Topic07  = lazy(() => import('./pages/topic07-netfilter'))
const Topic08  = lazy(() => import('./pages/topic08-xdp-ebpf'))
const Topic09  = lazy(() => import('./pages/topic09-synchronization'))
const Topic10  = lazy(() => import('./pages/topic10-drivers'))
const Topic11  = lazy(() => import('./pages/topic11-debugging'))
const Topic12  = lazy(() => import('./pages/topic12-security'))
const Topic13  = lazy(() => import('./pages/topic13-kvm'))
const Glossary = lazy(() => import('./pages/Glossary'))

function PageFallback() {
    return (
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600">
            <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm font-mono">Loading...</span>
        </div>
    )
}

export default function App() {
    return (
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route index element={<Home />} />
                        <Suspense fallback={<PageFallback />}>
                            <Route path="topic/01-overview"     element={<Topic01  />} />
                            <Route path="topic/02-scheduler"    element={<Topic02  />} />
                            <Route path="topic/03-memory"       element={<Topic03  />} />
                            <Route path="topic/04-filesystem"   element={<Topic04  />} />
                            <Route path="topic/05-interrupts"   element={<Topic05  />} />
                            <Route path="topic/06-network-stack" element={<Topic06 />} />
                            <Route path="topic/07-netfilter"    element={<Topic07  />} />
                            <Route path="topic/08-xdp-ebpf"     element={<Topic08  />} />
                            <Route path="topic/09-synchronization" element={<Topic09 />} />
                            <Route path="topic/10-drivers"      element={<Topic10  />} />
                            <Route path="topic/11-debugging"    element={<Topic11  />} />
                            <Route path="topic/12-security"     element={<Topic12  />} />
                            <Route path="topic/13-kvm"          element={<Topic13  />} />
                            <Route path="glossary"              element={<Glossary />} />
                        </Suspense>
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    )
}
