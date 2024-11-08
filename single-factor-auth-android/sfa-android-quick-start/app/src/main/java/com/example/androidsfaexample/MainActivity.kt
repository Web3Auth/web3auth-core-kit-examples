

package com.example.androidsfaexample

import android.content.ContentValues.TAG
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.auth0.android.jwt.JWT
// IMP START - Auth Provider Login
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
// IMP END - Auth Provider Login
import com.google.gson.Gson
// IMP START - Quick Start
import com.web3auth.singlefactorauth.SingleFactorAuth
import com.web3auth.singlefactorauth.types.LoginParams
import com.web3auth.singlefactorauth.types.SessionData
import com.web3auth.singlefactorauth.types.Web3AuthOptions
import org.torusresearch.fetchnodedetails.types.Web3AuthNetwork
// IMP END - Quick Start
import java.util.concurrent.ExecutionException

class MainActivity : AppCompatActivity() {
    private lateinit var singleFactorAuth: SingleFactorAuth
    private lateinit var web3AuthOptions: Web3AuthOptions
    private lateinit var loginParams: LoginParams
    private var torusKey: String? = null
    private var sessionData: SessionData? = null
    // IMP START - Auth Provider Login
    private lateinit var auth: FirebaseAuth
    // IMP END - Auth Provider Login
    private var publicAddress: String = ""
    private val gson = Gson()


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        // IMP START - Initialize Web3Auth SFA
        web3AuthOptions = Web3AuthOptions(
            "BJRZ6qdDTbj6Vd5YXvV994TYCqY42-PxldCetmvGTUdoq6pkCqdpuC1DIehz76zuYdaq1RJkXGHuDraHRhCQHvA",
            Web3AuthNetwork.MAINNET,
            40
        )

        val context: Context = this.applicationContext
        singleFactorAuth = SingleFactorAuth(web3AuthOptions, context)
        // IMP END - Initialize Web3Auth SFA


        // Setup UI and event handlers
        val signInButton = findViewById<Button>(R.id.signIn)
        signInButton.setOnClickListener { signIn() }

        val signOutButton = findViewById<Button>(R.id.signOut)
        signOutButton.setOnClickListener { signOut(this.applicationContext) }
        singleFactorAuth.getSessionData()
        val torusKeyCF = singleFactorAuth.initialize(this.applicationContext)
        Log.i("Is connected",singleFactorAuth.isConnected().toString())
        torusKeyCF.whenComplete { sessionData, error ->
            if (error != null) {
                Log.e("Initialize Error", error.toString())
            } else if (sessionData == null) {
                Log.e("Initialize", "No active session found")
            } else  {
                this.sessionData = sessionData
                torusKey = sessionData.privateKey
                publicAddress = sessionData.publicAddress
                Log.i("Private Key", torusKey!!.trimIndent())
                Log.i("User Info", sessionData.userInfo.toString())
                reRender()
            }
        }

        reRender()
    }

    private fun signIn(){
        // Initialize Firebase Auth
        // IMP START - Auth Provider Login
        auth = Firebase.auth
        auth.signInWithEmailAndPassword("android@firebase.com", "Android@Web3Auth")
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    // Sign in success, update UI with the signed-in user's information
                    Log.d(TAG, "signInWithEmail:success")
                    val user = auth.currentUser
                    user!!.getIdToken(true).addOnSuccessListener { result ->
                        val idToken = result.token
                        // IMP END - Auth Provider Login
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
                                LoginParams("w3a-firebase-demo", "$sub", "$idToken")
                            // IMP END - Verifier Creation
                            try {
                                // IMP START - Get Key
                                sessionData = singleFactorAuth.connect(
                                    loginParams,
                                    this.applicationContext,
                                )
                                // IMP END - Get Key
                            } catch (e: ExecutionException) {
                                e.printStackTrace()
                            } catch (e: InterruptedException) {
                                e.printStackTrace()
                            }
                            torusKey = sessionData!!.privateKey
                            publicAddress = sessionData!!.publicAddress
                            Log.i("Private Key:", torusKey!!.trimIndent())
                            Log.i("Public Address:", publicAddress.trimIndent())
                            Log.i("User Info", sessionData!!.userInfo.toString())
                            println(sessionData!!.signatures!!.sessionAuthKey)
                            reRender()
                        }
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

    private fun signOut(context: Context) {
        publicAddress = ""
        Firebase.auth.signOut()
        singleFactorAuth.logout(context)
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
