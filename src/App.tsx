import { HashRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppLayout } from './components/layout/AppLayout'
import Home from './pages/Home'
import Topic01 from './pages/topic01-overview'
import Topic02 from './pages/topic02-scheduler'
import Topic03 from './pages/topic03-memory'
import Topic04 from './pages/topic04-filesystem'
import Topic05 from './pages/topic05-interrupts'
import Topic06 from './pages/topic06-network-stack'
import Topic07 from './pages/topic07-netfilter'
import Topic08 from './pages/topic08-xdp-ebpf'
import Topic09 from './pages/topic09-synchronization'
import Topic10 from './pages/topic10-drivers'
import Topic11 from './pages/topic11-debugging'
import Topic12 from './pages/topic12-security'
import Topic13 from './pages/topic13-kvm'
import Glossary from './pages/Glossary'

export default function App() {
    return (
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route index element={<Home />} />
                        <Route path="topic/01-overview" element={<Topic01 />} />
                        <Route path="topic/02-scheduler" element={<Topic02 />} />
                        <Route path="topic/03-memory" element={<Topic03 />} />
                        <Route path="topic/04-filesystem" element={<Topic04 />} />
                        <Route path="topic/05-interrupts" element={<Topic05 />} />
                        <Route path="topic/06-network-stack" element={<Topic06 />} />
                        <Route path="topic/07-netfilter" element={<Topic07 />} />
                        <Route path="topic/08-xdp-ebpf" element={<Topic08 />} />
                        <Route path="topic/09-synchronization" element={<Topic09 />} />
                        <Route path="topic/10-drivers" element={<Topic10 />} />
                        <Route path="topic/11-debugging" element={<Topic11 />} />
                        <Route path="topic/12-security" element={<Topic12 />} />
                        <Route path="topic/13-kvm" element={<Topic13 />} />
                        <Route path="glossary" element={<Glossary />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    )
}
