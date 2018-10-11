import Upload, { UploadChangeParam } from "antd/lib/upload";
import * as React from "react";
import styled from "styled-components";
import { UploadFile } from "antd/lib/upload/interface";
import AntIcon from "antd/lib/icon";
import AntButton from "antd/lib/button";
import Input from "antd/lib/input";
import AntCard from "antd/lib/card";
import * as localForage from "localforage";
import "./App.css";

const INSTAGRAM_IMAGE_WIDTH = 1080;

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

function resizeImage(image: string, width: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  const img = new Image();

  return new Promise<string>((resolve, reject) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return reject(new Error("Image resize failed"));
    }
    img.onload = () => {
      // set size proportional to image
      canvas.height = canvas.width * (img.height / img.width);

      // step 1 - resize to 50%
      const oc = document.createElement("canvas");
      const octx = oc.getContext("2d");

      if (!octx) {
        return reject(new Error("Image resize failed"));
      }

      oc.width = img.width * 0.5;
      oc.height = img.height * 0.5;
      octx.drawImage(img, 0, 0, oc.width, oc.height);

      // step 2
      octx.drawImage(oc, 0, 0, oc.width * 0.5, oc.height * 0.5);

      // step 3, resize to final size
      ctx.drawImage(
        oc,
        0,
        0,
        oc.width * 0.5,
        oc.height * 0.5,
        0,
        0,
        canvas.width,
        canvas.height
      );

      return resolve(canvas.toDataURL());
    };
    img.src = image;
    img.onerror = reject;
  });
}

function getBase64(file: File) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (!reader.result) {
        reject(new Error("No data"));
        return;
      }
      resolve(reader.result.toString());
    };
    reader.onerror = reject;
  });
}

interface IPicture {
  takenAt: Date;
  data: string;
}

interface IPlant {
  id: number;
  name: string;
  pictures: IPicture[];
}

class Rotator extends React.Component<
  { pictures: IPicture[] },
  { tick: number }
> {
  public state = {
    tick: 0
  };
  public componentDidMount() {
    setInterval(
      () => this.setState(state => ({ ...state, tick: state.tick + 1 })),
      1000
    );
  }
  public render() {
    const current = this.props.pictures[
      this.state.tick % this.props.pictures.length
    ];
    return <img src={current.data} />;
  }
}

class App extends React.Component<
  {},
  { plants: IPlant[]; currentName: string }
> {
  public state = {
    plants: [],
    currentName: ""
  };

  public async componentDidMount() {
    const storedPlants = JSON.parse(
      (await localForage.getItem<string>("plants")) || "[]"
    );
    this.setState(state => ({ ...state, plants: storedPlants }));
  }

  public async fileUploaded(selectedPlant: IPlant, upload: UploadChangeParam) {
    const base64Images = await Promise.all(
      upload.fileList
        .filter(file => file.originFileObj)
        .map(async (file: UploadFile) =>
          resizeImage(
            await getBase64(file.originFileObj as File),
            INSTAGRAM_IMAGE_WIDTH
          )
        )
    ).catch(err => {
      console.error(err);
      throw err;
    });

    this.setState(state => ({
      ...state,
      plants: state.plants.map(plant => {
        if (plant.id !== selectedPlant.id) {
          return plant;
        }
        return {
          ...plant,
          pictures: plant.pictures.concat(
            base64Images.map(data => ({ data, takenAt: new Date() }))
          )
        };
      })
    }));
  }

  public createPlant = () => {
    this.setState(state => ({
      ...state,
      currentName: "",
      plants: state.plants.concat({
        id: Date.now(),
        name: state.currentName,
        pictures: []
      })
    }));
  };
  public deletePlant = (plant: IPlant) => {
    if (!window.confirm("Sure you wanna delete this?")) {
      return;
    }
    this.setState(state => ({
      ...state,
      plants: state.plants.filter(({ id }) => id !== plant.id)
    }));
  };
  public updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    this.setState(state => ({
      ...state,
      currentName: value
    }));
  };
  public componentDidUpdate() {
    localForage
      .setItem("plants", JSON.stringify(this.state.plants))
      .catch(err => alert(err.message));
  }
  public render() {
    return (
      <div>
        <Header>
          <Input
            value={this.state.currentName}
            onChange={this.updateName}
            placeholder="Name your new plant"
          />
          <AntButton
            icon="plus"
            disabled={this.state.currentName === ""}
            onClick={this.createPlant}
          />
        </Header>
        <Cards>
          {this.state.plants.map((plant: IPlant) => (
            <Card
              key={plant.id}
              actions={[
                <Upload
                  key="camera"
                  showUploadList={false}
                  onChange={(upload: UploadChangeParam) =>
                    this.fileUploaded(plant, upload)
                  }
                  beforeUpload={() => false}
                >
                  <Icon type="camera" theme="filled" />
                </Upload>,
                <Icon
                  onClick={() => this.deletePlant(plant)}
                  key="delete"
                  type="delete"
                />
              ]}
              cover={
                plant.pictures.length === 0 ? (
                  <h1>No pictures yet!</h1>
                ) : (
                  <Rotator pictures={plant.pictures} />
                )
              }
              title={plant.name}
            />
          ))}
        </Cards>
      </div>
    );
  }
}

export default App;
