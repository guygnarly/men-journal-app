import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import Community from './pages/Community';
import Insights from './pages/Insights';
import Resources from './pages/Resources';
import MoodCheckin from './pages/MoodCheckin';
import Profile from './pages/Profile';
import Goals from './pages/Goals';
import Tools from './pages/Tools';
import AIMentor from './pages/AIMentor';
import Layout from './Layout.jsx';


export const PAGES = {
    "Onboarding": Onboarding,
    "Dashboard": Dashboard,
    "Journal": Journal,
    "Community": Community,
    "Insights": Insights,
    "Resources": Resources,
    "MoodCheckin": MoodCheckin,
    "Profile": Profile,
    "Goals": Goals,
    "Tools": Tools,
    "AIMentor": AIMentor,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
    Layout: Layout,
};