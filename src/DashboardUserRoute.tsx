import {Route, Routes} from "react-router";
import Home from "./pages/Dashboard/Home.tsx";
import Calendar from "./pages/Calendar.tsx";
import FormElements from "./pages/Forms/FormElements.tsx";
import BasicTables from "./pages/Tables/BasicTables.tsx";
import Alerts from "./pages/UiElements/Alerts.tsx";
import Avatars from "./pages/UiElements/Avatars.tsx";
import Badges from "./pages/UiElements/Badges.tsx";
import Buttons from "./pages/UiElements/Buttons.tsx";
import Images from "./pages/UiElements/Images.tsx";
import Videos from "./pages/UiElements/Videos.tsx";
import LineChart from "./pages/Charts/LineChart.tsx";
import BarChart from "./pages/Charts/BarChart.tsx";
import PatientListPage from "./pages/Patient/PatientListPage.tsx";
import PatientDetailPage from "./pages/Patient/PatientDetailPage.tsx";
import AdminProfiles from "./pages/AdminPages/AdminProfiles.tsx";
import WorkflowListPage from "./pages/Workflow/WorkflowListPage.tsx";
import NotificationListPage from "./pages/Notification/NotificationListPage.tsx";

function DashboardUserRoute  () {

    return (
        <Routes>
                <Route index path="/home" element={<Home />} />

                {/* Others Page */}
                <Route path="/profile" element={<AdminProfiles />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/patient" element={<PatientListPage />} />
                <Route path="/workflow" element={<WorkflowListPage />} />
                <Route path="/notification" element={<NotificationListPage />} />
                <Route path="/patient/:id" element={<PatientDetailPage />} />

                {/* Forms */}
                <Route path="/form-elements" element={<FormElements />} />

                {/* Tables */}
                <Route path="/basic-tables" element={<BasicTables />} />

                {/* Ui Elements */}
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/avatars" element={<Avatars />} />
                <Route path="/badge" element={<Badges />} />
                <Route path="/buttons" element={<Buttons />} />
                <Route path="/images" element={<Images />} />
                <Route path="/videos" element={<Videos />} />

                {/* Charts */}
                <Route path="/line-chart" element={<LineChart />} />
                <Route path="/bar-chart" element={<BarChart />} />

        </Routes>
    )

}

export default DashboardUserRoute;