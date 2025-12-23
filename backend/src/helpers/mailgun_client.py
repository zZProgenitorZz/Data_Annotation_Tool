# mailgun_client.py
import requests
from backend.config import settings

def send_email_via_mailgun(to_email: str, subject: str, text: str):
     
    """
    Sends a plain text email using Mailgun's HTTP API.
    """
    baseUrl = "https://api.mailgun.net"

    url = f"{baseUrl}/v3/{settings.mailgun_domain}/messages"

    auth = ("api", settings.mailgun_api_key)

    data = {
        "from": settings.mail_from,  # "AiDx Annotation Tool <no-reply@...>"
        "to": [to_email],
        "subject": subject,
        "text": text,
    }

    print(url)
  
 
    response = requests.post(url, auth=auth, data=data)

    # print("REQUEST HEADERS:", response.request.headers)
    # print("REQUEST BODY:", response.request.body)

    response.raise_for_status()  # raises error if Mailgun says it's not OK

  	



       # response =  requests.post(
  	# 	"https://api.mailgun.net/v3/sandbox556ddad470b340d3a4b76e4b8d85c802.mailgun.org/messages",
  	# 	auth=("api", settings.mailgun_api_key),
  	# 	data={"from": "Mailgun Sandbox <postmaster@sandbox556ddad470b340d3a4b76e4b8d85c802.mailgun.org>",
	# 		"to": "Shantosh Merhai <progen-7@hotmail.com>",
  	# 		"subject": "Hello Shantosh Merhai",
  	# 		"text": "Congratulations Shantosh Merhai, you just sent an email with Mailgun! You are truly awesome!"})