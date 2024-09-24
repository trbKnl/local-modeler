import json
import zipfile
from pathlib import Path
import io

import pandas as pd

import port.api.props as props
from port.api.commands import (
    CommandSystemDonate,
    CommandUIRender, 
    CommandSystemExit,
    CommandSystemGetParameters,
    CommandSystemPostParameters,
)
import port.ols as ols
import port.lda as lda


def process(session_id: str):
    platform = "Platform of interest"

    # Start of the data donation flow
    while True:
        # Ask the participant to submit a file
        file_prompt = generate_file_prompt(platform, "application/zip, text/plain")
        file_prompt_result = yield render_page(platform, file_prompt)

        # If the participant submitted a file: continue
        if file_prompt_result.__type__ == 'PayloadString':

            # Validate the file the participant submitted
            # In general this is wise to do 
            is_data_valid = validate_the_participants_input(file_prompt_result.value)

            # Happy flow:
            # The file the participant submitted is valid
            if is_data_valid == True:

                data = extract(file_prompt_result.value)

                result = yield getParameters()
                while result.value != None:
                    print(f"[Python script] received {result.value}")

                    client_run = json.loads(result.value)
                    
                    # regression example
                    #df = pd.DataFrame(data)
                    #model = ols.learn_params(df, ["x1", "x2"], "y", client_run["model"])

                    # lda example
                    model = lda.learn_params(data, client_run["model"])

                    client_run["model"] = model

                    yield postParameters(client_run)
                    result = yield getParameters()

                break

            # Sad flow:
            # The data was not valid, ask the participant to retry
            if is_data_valid == False:
                retry_prompt = generate_retry_prompt(platform)
                retry_prompt_result = yield render_page(platform, retry_prompt)

                # The participant wants to retry: start from the beginning
                if retry_prompt_result.__type__ == 'PayloadTrue':
                    continue
                # The participant does not want to retry or pressed skip
                else:
                    break

        # The participant did not submit a file and pressed skip
        else:
            break

    yield exit_port(0, "Success")
    yield render_end_page()



def extract(zip_file: str, file_of_interest: str = "data.json"):
    """
    Extract and return the JSON content of 'file_of_interest' from a zip file.
    """
    try:
        with zipfile.ZipFile(zip_file) as z:
            for name in z.namelist():
                fp = Path(name)
                if fp.name == file_of_interest:
                    with z.open(name) as f:
                        return json.load(f)
    except Exception as e:
        print(f"Error extracting {file_of_interest}: {e}")
        return None



def validate_the_participants_input(zip_file: str) -> bool:
    """
    Check if the participant actually submitted a zipfile
    Returns True if participant submitted a zipfile, otherwise False

    In reality you need to do a lot more validation.
    Some things you could check:
    - Check if the the file(s) are the correct format (json, html, binary, etc.)
    - If the files are in the correct language
    """

    try:
        with zipfile.ZipFile(zip_file) as zf:
            return True
    except zipfile.BadZipFile:
        return False


def render_end_page():
    """
    Renders a thank you page
    """
    page = props.PropsUIPageEnd()
    return CommandUIRender(page)


def render_page(platform: str, body):
    """
    Renders the UI components
    """
    header = props.PropsUIHeader(props.Translatable({"en": platform, "nl": platform }))
    footer = props.PropsUIFooter()
    page = props.PropsUIPageDonation(platform, header, body, footer)
    return CommandUIRender(page)


def generate_retry_prompt(platform: str) -> props.PropsUIPromptConfirm:
    text = props.Translatable({
        "en": f"Unfortunately, we cannot process your {platform} file. Continue, if you are sure that you selected the right file. Try again to select a different file.",
        "nl": f"Helaas, kunnen we uw {platform} bestand niet verwerken. Weet u zeker dat u het juiste bestand heeft gekozen? Ga dan verder. Probeer opnieuw als u een ander bestand wilt kiezen."
    })
    ok = props.Translatable({
        "en": "Try again",
        "nl": "Probeer opnieuw"
    })
    cancel = props.Translatable({
        "en": "Continue",
        "nl": "Verder"
    })
    return props.PropsUIPromptConfirm(text, ok, cancel)


def generate_file_prompt(platform, extensions) -> props.PropsUIPromptFileInput:
    description = props.Translatable({
        "en": f"Please follow the download instructions and choose the file that you stored on your device. Click “Skip” at the right bottom, if you do not have a {platform} file. ",
        "nl": f"Volg de download instructies en kies het bestand dat u opgeslagen heeft op uw apparaat. Als u geen {platform} bestand heeft klik dan op “Overslaan” rechts onder."
    })
    return props.PropsUIPromptFileInput(description, extensions)


def generate_consent_prompt(*args: pd.DataFrame) -> props.PropsUIPromptConsentForm:
    description = props.Translatable({
       "en": "Below you will find meta data about the contents of the zip file you submitted. Please review the data carefully and remove any information you do not wish to share. If you would like to share this data, click on the 'Yes, share for research' button at the bottom of this page. By sharing this data, you contribute to research <insert short explanation about your research here>.",
       "nl": "Hieronder ziet u gegevens over de zip die u heeft ingediend. Bekijk de gegevens zorgvuldig, en verwijder de gegevens die u niet wilt delen. Als u deze gegevens wilt delen, klik dan op de knop 'Ja, deel voor onderzoek' onderaan deze pagina. Door deze gegevens te delen draagt u bij aan onderzoek over <korte zin over het onderzoek>."
    })

    donate_question = props.Translatable({
       "en": "Do you want to share this data for research?",
       "nl": "Wilt u deze gegevens delen voor onderzoek?"
    })

    donate_button = props.Translatable({
       "en": "Yes, share for research",
       "nl": "Ja, deel voor onderzoek"
    })

    tables = [] 
    for index, df in enumerate(args):
        table_title = props.Translatable({
            "en": f"The contents of your zipfile contents (Table {index + 1}/{len(args)})",
            "nl": "De inhoud van uw zip bestand"
        })
        tables.append(props.PropsUIPromptConsentFormTable(f"zip_contents_{index}", table_title, df))

    return props.PropsUIPromptConsentForm(
       tables,
       [],
       description = description,
       donate_question = donate_question,
       donate_button = donate_button
    )


def donate(key, json_string):
    return CommandSystemDonate(key, json_string)


def getParameters():
    return CommandSystemGetParameters()


def postParameters(result):
    return CommandSystemPostParameters(
        id = result["id"],
        checkValue = result["checkValue"],
        model = result["model"],
    )


def exit_port(code, info):
    return CommandSystemExit(code, info)
