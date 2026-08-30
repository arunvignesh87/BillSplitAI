package com.billsplit.ai;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(
            alias = "sms",
            strings = { Manifest.permission.READ_SMS }
        )
    }
)
public class SmsReaderPlugin extends Plugin {

    @PluginMethod
    public void getRecentMessages(PluginCall call) {
        if (!getPermissionState("sms").equals(PermissionState.GRANTED)) {
            requestPermissionForAlias("sms", call, "smsPermsCallback");
            return;
        }
        readSmsInbox(call);
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        if (getPermissionState("sms").equals(PermissionState.GRANTED)) {
            readSmsInbox(call);
        } else {
            call.reject("Permission to read SMS was denied");
        }
    }

    private void readSmsInbox(PluginCall call) {
        try {
            ContentResolver cr = getContext().getContentResolver();
            Uri uri = Uri.parse("content://sms/inbox");
            String[] projection = new String[] { "_id", "address", "body", "date" };
            Cursor cursor = cr.query(uri, projection, null, null, "date DESC LIMIT 50");

            JSArray messages = new JSArray();
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    JSObject msg = new JSObject();
                    msg.put("id", cursor.getString(cursor.getColumnIndexOrThrow("_id")));
                    msg.put("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    msg.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    msg.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    messages.put(msg);
                } while (cursor.moveToNext());
                cursor.close();
            }

            JSObject result = new JSObject();
            result.put("messages", messages);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
        }
    }
}
