import * as React from "react";
import styled from "@emotion/styled";
import AntIcon from "antd/lib/icon";
import AntButton from "antd/lib/button";
import Input from "antd/lib/input";
import AntCard from "antd/lib/card";
import * as localForage from "localforage";
import "./App.css";
import { Camera } from "./components/Camera";

localForage.config({
  driver: localForage.INDEXEDDB,
  name: "grow",
  version: 1.0,
  storeName: "state"
});

const Icon = styled(AntIcon)`
  font-size: 25px;
`;

const Header = styled.header`
  padding: 1.5em;
  display: flex;
  ${Icon} {
    font-size: 34px;
    margin-top: -1px;
    margin-left: 3px;
  }
`;

const Card = styled(AntCard)``;

const Cards = styled.div`
  ${Card} {
    margin-bottom: 2em;
  }
`;

interface IPicture {
  takenAt: Date;
  data: string;
}

interface IPlant {
  id: number;
  name: string;
  pictures: IPicture[];
}

function Rotator(props: { pictures: IPicture[] }) {
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const interval = window.setInterval(() => setTick(tick + 1), 1000);
    return () => {
      window.clearInterval(interval);
    };
  });
  const current = props.pictures[tick % props.pictures.length];

  if (props.pictures.length === 0) {
    return <div>No pictures yet!</div>;
  }

  return <img src={current.data} />;
}

const CameraOverlay = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const CameraOverlayControls = styled.div`
  width: 100%;
  position: absolute;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CameraButton = styled.button`
  width: 50px;
  height: 50px;
  border-radius: 25px;
`;

const CameraLastShot = styled.img`
  opacity: 0.4;
`;

export function App() {
  const [plants, setPlants] = React.useState<IPlant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = React.useState<number | null>(
    null
  );
  const [currentName, setCurrentName] = React.useState("");

  const createPlant = () => {
    const newPlant = {
      id: Date.now(),
      name: currentName,
      pictures: []
    };
    const newPlants = plants.concat(newPlant);
    setPlants(newPlants);

    if (plants.length === 0) {
      setSelectedPlantId(newPlant.id);
    }
  };

  const deletePlant = (plant: IPlant) => {
    if (!window.confirm("Sure you wanna delete this?")) {
      return;
    }
    const newPlants = plants.filter(({ id }) => id !== plant.id);
    setPlants(newPlants);
  };

  const updatePlant = (plantId: number, updater: (plant: IPlant) => IPlant) => {
    setPlants(
      plants.map(plant => {
        if (plant.id === plantId) {
          return updater(plant);
        }
        return plant;
      })
    );
  };

  const updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCurrentName(value);
  };

  React.useEffect(() => {
    async function getStoredPlants() {
      const storedPlants = JSON.parse(
        (await localForage.getItem<string>("plants")) || "[]"
      );

      setPlants(storedPlants);
    }
    getStoredPlants();
  }, []);

  React.useEffect(
    () => {
      console.log("Storing plants", plants);

      localForage
        .setItem("plants", JSON.stringify(plants))
        .catch(err => alert(err.message));
    },
    [plants]
  );

  const camera = React.useRef<any>();

  const takePicture = () => {
    if (!camera.current) {
      return;
    }

    const screenshot: string = camera.current.getScreenshot();

    updatePlant(selectedPlantId as number, plant => ({
      ...plant,
      pictures: plant.pictures.concat({
        takenAt: new Date(),
        data: screenshot
      })
    }));
  };

  function getLastPicture(plantId: number) {
    const plantOrNull = plants.find(({ id }) => id === plantId);
    if (!plantOrNull) {
      return null;
    }

    return plantOrNull.pictures[plantOrNull.pictures.length - 1];
  }

  return (
    <div>
      <Cards>
        {plants.map((plant: IPlant) => {
          const isSelected = selectedPlantId === plant.id;
          return (
            <Card
              key={plant.id}
              actions={[
                <Icon
                  onClick={() => deletePlant(plant)}
                  key="delete"
                  type="delete"
                />
              ]}
              cover={
                isSelected ? (
                  <Camera ref={camera}>
                    <CameraOverlay>
                      {(() => {
                        const lastPicture = getLastPicture(plant.id);

                        if (!lastPicture) {
                          return null;
                        }

                        return <CameraLastShot src={lastPicture.data} />;
                      })()}
                      <CameraOverlayControls>
                        <CameraButton onClick={takePicture}>snap</CameraButton>
                      </CameraOverlayControls>
                    </CameraOverlay>
                  </Camera>
                ) : (
                  <Rotator pictures={plant.pictures} />
                )
              }
              title={
                <div
                  onClick={() =>
                    isSelected
                      ? setSelectedPlantId(null)
                      : setSelectedPlantId(plant.id)
                  }
                >
                  {plant.name} {isSelected ? "(selected)" : ""}
                </div>
              }
            />
          );
        })}
      </Cards>
      <Header>
        <Input
          value={currentName}
          onChange={updateName}
          placeholder="Name your new plant"
        />
        <AntButton
          icon="plus"
          disabled={currentName === ""}
          onClick={createPlant}
        />
      </Header>
    </div>
  );
}
