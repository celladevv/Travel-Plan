import { useEffect, useState } from "react";
import { useTrip, activeStop } from "./store.js";
import { getRatesTable, getHourly } from "./api.js";
import Onboarding from "./components/Onboarding.jsx";
import TabBar from "./components/TabBar.jsx";
import Today from "./components/Today.jsx";
import Convert from "./components/Convert.jsx";
import Spend from "./components/Spend.jsx";
import Plan from "./components/Plan.jsx";
import Stay from "./components/Stay.jsx";

export default function App() {
  const store = useTrip();
  const { trip } = store;
  const [tab, setTab] = useState("today");
  const [editing, setEditing] = useState(false);

  const stop = trip ? activeStop(trip) : null;

  // Shared live data: one rate table keyed to the home currency (every
  // conversion in the app derives from it) and the active stop's forecast.
  const [fx, setFx] = useState(null); // { rates, updated, stale }
  const [wx, setWx] = useState(null); // { hours, fetchedAt, stale }

  useEffect(() => {
    if (!trip) return;
    let on = true;
    getRatesTable(trip.homeCurrency)
      .then((r) => on && setFx(r))
      .catch(() => on && setFx(null));
    return () => (on = false);
  }, [trip?.homeCurrency]);

  useEffect(() => {
    if (!stop?.destination) return;
    let on = true;
    setWx(null);
    getHourly(stop.destination.lat, stop.destination.lon)
      .then((w) => on && setWx(w))
      .catch(() => on && setWx(null));
    return () => (on = false);
  }, [stop?.destination?.lat, stop?.destination?.lon]);

  if (!trip || editing) {
    return (
      <div className="app">
        <Onboarding
          existing={editing ? trip : null}
          onDone={(t) => {
            store.setTrip(t);
            setEditing(false);
            setTab("today");
          }}
          onCancel={editing ? () => setEditing(false) : null}
        />
      </div>
    );
  }

  const shared = { store, fx, wx, stop };
  const screens = {
    today: <Today {...shared} onEditTrip={() => setEditing(true)} goTab={setTab} />,
    plan: <Plan {...shared} />,
    convert: <Convert trip={trip} fx={fx} stop={stop} />,
    spend: <Spend {...shared} />,
    stay: <Stay store={store} stop={stop} />,
  };

  return (
    <div className="app">
      {screens[tab]}
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}
