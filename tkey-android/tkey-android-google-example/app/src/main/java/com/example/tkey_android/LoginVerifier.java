package com.example.tkey_android;

import androidx.annotation.NonNull;

import org.torusresearch.customauth.types.LoginType;

public class LoginVerifier {
    private final String name;
    private final LoginType typeOfLogin;
    private final String clientId;
    private final String verifier;
    private String domain;
    private String verifierIdField;
    private boolean isVerfierIdCaseSensitive = true;

    public LoginVerifier(String name, LoginType typeOfLogin, String clientId, String verifier) {
        this.name = name;
        this.typeOfLogin = typeOfLogin;
        this.clientId = clientId;
        this.verifier = verifier;
    }

    public LoginVerifier(String name, LoginType typeOfLogin, String clientId, String verifier, String domain) {
        this(name, typeOfLogin, clientId, verifier);
        this.domain = domain;
    }

    @SuppressWarnings("unused")
    public LoginVerifier(String name, LoginType typeOfLogin, String clientId, String verifier, String domain, String verifierIdField, boolean isVerfierIdCaseSensitive) {
        this(name, typeOfLogin, clientId, verifier, domain);
        this.verifierIdField = verifierIdField;
        this.isVerfierIdCaseSensitive = isVerfierIdCaseSensitive;
    }

    public String getDomain() {
        return domain;
    }

    public String getVerifierIdField() {
        return verifierIdField;
    }

    public boolean isVerfierIdCaseSensitive() {
        return isVerfierIdCaseSensitive;
    }

    public String getName() {
        return name;
    }

    public LoginType getTypeOfLogin() {
        return typeOfLogin;
    }

    public String getClientId() {
        return clientId;
    }

    public String getVerifier() {
        return verifier;
    }

    @Override
    @NonNull
    public String toString() {
        return name;
    }
}