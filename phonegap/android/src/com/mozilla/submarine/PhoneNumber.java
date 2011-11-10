package com.mozilla.submarine;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.telephony.TelephonyManager;

import com.phonegap.api.Plugin;
import com.phonegap.api.PluginResult;
import com.phonegap.api.PluginResult.Status;

public class PhoneNumber extends Plugin {
	@Override
	public PluginResult execute(String action, JSONArray args, String callbackId) {
		PluginResult result = null;
		
		TelephonyManager tm = (TelephonyManager) this.ctx.getSystemService(Context.TELEPHONY_SERVICE);
		
		//Hmm, this returns empty string for my pay as you go sim.
		String number = tm.getLine1Number();

		JSONObject JSONresult = new JSONObject();

		try {
			JSONresult.put("number", number);
		} catch (JSONException jsonEx) {
			result = new PluginResult(Status.JSON_EXCEPTION);
		}
		result = new PluginResult(Status.OK, JSONresult);

		return result;
	}
}
