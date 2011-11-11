package com.mozilla.submarine;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.accounts.Account;
import android.accounts.AccountManager;
//import android.util.Log;

import com.phonegap.api.Plugin;
import com.phonegap.api.PluginResult;
import com.phonegap.api.PluginResult.Status;

public class AccountPlugin extends Plugin {
	@Override
	public PluginResult execute(String action, JSONArray args, String callbackId) {
		PluginResult result = null;
		
		AccountManager am = AccountManager.get(this.ctx);
		
		Account[] accounts = am.getAccounts();
		String name = "";

		//Log.d("AccountPlugin", "accounts length: " + accounts.length);
		
		if (accounts.length > 0) {
			name = accounts[0].name;
		}
		
		//Log.d("AccountPlugin", "account name: " + name);

		JSONObject JSONresult = new JSONObject();

		try {
			JSONresult.put("name", name);
		} catch (JSONException jsonEx) {
			result = new PluginResult(Status.JSON_EXCEPTION);
		}
		result = new PluginResult(Status.OK, JSONresult);

		return result;
	}
}
