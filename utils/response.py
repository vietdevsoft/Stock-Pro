def success_response(message="Success", data=None,):
    return {"success": True, "message": message, "data": data}


def error_response(message="Error", data=None):
    return {"success": False, "message": message, "data": data}
