/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Home from './pages/Home';
import JoinGame from './pages/JoinGame';
import Lobby from './pages/Lobby';
import ProfileSetup from './pages/ProfileSetup';
import RoomDraft from './pages/RoomDraft';
import Admin from './pages/Admin';
import CreateRoom from './pages/CreateRoom';
import Leaderboard from './pages/Leaderboard';
import MyDraft from './pages/MyDraft';
import Rate from './pages/Rate';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "JoinGame": JoinGame,
    "Lobby": Lobby,
    "ProfileSetup": ProfileSetup,
    "RoomDraft": RoomDraft,
    "Admin": Admin,
    "CreateRoom": CreateRoom,
    "Leaderboard": Leaderboard,
    "MyDraft": MyDraft,
    "Rate": Rate,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};