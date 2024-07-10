import { 
  CommandSystem, 
  CommandSystemDonate, 
  CommandSystemExit, 
  CommandSystemGetParameters,
  CommandSystemPostParameters,
  isCommandSystemDonate, 
  isCommandSystemExit,
  isCommandSystemGetParameters,
  isCommandSystemPostParameters,
} from './framework/types/commands'
import { Bridge } from './framework/types/modules'

export default class FakeBridge implements Bridge {
  async send (command: CommandSystem): Promise<any> {
    if (isCommandSystemGetParameters(command)) {
      return await this.getParameters()
    } else if (isCommandSystemPostParameters(command)) {
      return await this.postParameters(command)
    } else if (isCommandSystemExit(command)) {
      this.handleExit(command)
    } else {
      console.log('[FakeBridge] received unknown command: ' + JSON.stringify(command))
    }
  }

  async getParameters (): Promise<any> {
    const url = constructApiUrl()
    console.log(`[FakeBridge] asking for parameters: ${url}`)
    const data = await getData(url)
    console.log(`[FakeBridge] received parameters ${JSON.stringify(data)}`);
    return data
  }

  async postParameters (command: CommandSystemPostParameters): Promise<any> {
    const data = { ...command, ["__type__"]: undefined }
    const url = constructApiUrl()
    await postData(url, data) 
  }

  handleExit (command: CommandSystemExit): void {
    console.log(`[FakeBridge] received exit: ${command.code}=${command.info}`)
  }
}

async function getData(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};


async function postData(url: string, data: any): Promise<void> {
  console.log(`[FakeBridge] going to post this data: ${JSON.stringify(data)}`)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`[FakeBridge] Post successfull`)
  } catch (error) {
    console.log(`[FakeBridge] Post failed`)
  }
};


function constructApiUrl(): string {
  const queryParams = new URLSearchParams(window.location.search);
  const participantId = queryParams.get('participantId');
  if (participantId === null) {
    throw new Error("You must give a participantId")
  }
  const url = `/api/?participantId=${participantId}`
  return url
}
