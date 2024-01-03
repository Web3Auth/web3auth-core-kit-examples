package com.example.androidsfaexample

import android.content.ContentValues.TAG
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.auth0.android.jwt.JWT
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import com.google.gson.Gson
// IMP START - Quick Start
import com.web3auth.singlefactorauth.SingleFactorAuth
// IMP END - Quick Start
import com.web3auth.singlefactorauth.types.LoginParams
import com.web3auth.singlefactorauth.types.SingleFactorAuthArgs
import com.web3auth.singlefactorauth.types.TorusKey
import org.torusresearch.fetchnodedetails.types.TorusNetwork
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException

class MainActivity : AppCompatActivity() {
    private lateinit var singleFactorAuth: SingleFactorAuth
    private lateinit var singleFactorAuthArgs: SingleFactorAuthArgs
    private lateinit var loginParams: LoginParams
    private var torusKey: TorusKey? = null
    private lateinit var auth: FirebaseAuth
    private var publicAddress: String = ""
    private val gson = Gson()


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // IMP START - Initialize Web3Auth SFA
        singleFactorAuthArgs = SingleFactorAuthArgs(TorusNetwork.TESTNET)
        singleFactorAuth = SingleFactorAuth(singleFactorAuthArgs)
        // IMP END - Initialize Web3Auth SFA


        // Setup UI and event handlers
        val signInButton = findViewById<Button>(R.id.signIn)
        signInButton.setOnClickListener { signIn() }

        val signOutButton = findViewById<Button>(R.id.signOut)
        signOutButton.setOnClickListener { signOut() }

        val sessionResponse: CompletableFuture<TorusKey> =
            singleFactorAuth.initialize(this.applicationContext)
        sessionResponse.whenComplete { torusKey, error ->
            if (torusKey != null) {
                publicAddress = torusKey?.publicAddress.toString()
                println("""Private Key: ${torusKey.privateKey?.toString(16)}""".trimIndent())
                reRender()
            } else {
                Log.d("MainActivity_SFA", error.message ?: "Something went wrong")
            }
        }

        reRender()
    }

    private fun signIn(){
        // Initialize Firebase Auth
        auth = Firebase.auth
        auth.signInWithEmailAndPassword("android@firebase.com", "Android@Web3Auth")
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    // Sign in success, update UI with the signed-in user's information
                    Log.d(TAG, "signInWithEmail:success")
                    val user = auth.currentUser
                    user!!.getIdToken(true).addOnSuccessListener { result ->
                        val idToken = result.token
                        //Do whatever
                        Log.d(TAG, "GetTokenResult result = $idToken")
                        if (idToken != null) {
                            val jwt = JWT(idToken)
                            val issuer = jwt.issuer //get registered claims
                            Log.d(TAG, "Issuer = $issuer")
                            val sub = jwt.getClaim("sub").asString() //get sub claims
                            Log.d(TAG, "sub = $sub")
                            // IMP START - Verifier Creation
                            loginParams =
                                LoginParams("web3auth-firebase-examples", "$sub", "$idToken")
                            // IMP END - Verifier Creation
                            try {
                                // IMP START - Get Key
                                torusKey = singleFactorAuth.getKey(
                                    loginParams,
                                    this.applicationContext,
                                    86400
                                ).get()
                                // IMP END - Get Key
                            } catch (e: ExecutionException) {
                                e.printStackTrace()
                            } catch (e: InterruptedException) {
                                e.printStackTrace()
                            }
                            publicAddress = torusKey?.publicAddress.toString()
                            println("""Private Key: ${torusKey?.privateKey?.toString(16)}""".trimIndent())
                            println("""Public Address: $publicAddress""".trimIndent())
                            reRender()
                        };
                    }
                } else {
                    // If sign in fails, display a message to the user.
                    Log.w(TAG, "signInWithEmail:failure", task.exception)
                    Toast.makeText(
                        baseContext, "Authentication failed.",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
    }

    private fun signOut() {
        publicAddress = ""
        reRender()
    }

    private fun reRender() {
        val contentTextView = findViewById<TextView>(R.id.contentTextView)
        val signInButton = findViewById<Button>(R.id.signIn)
        val signOutButton = findViewById<Button>(R.id.signOut)

        if (publicAddress.isNotEmpty()) {
            contentTextView.text = gson.toJson(publicAddress)
            contentTextView.visibility = View.VISIBLE
            signInButton.visibility = View.GONE
            signOutButton.visibility = View.VISIBLE
        } else {
            contentTextView.visibility = View.GONE
            signInButton.visibility = View.VISIBLE
            signOutButton.visibility = View.GONE
        }
    }
}