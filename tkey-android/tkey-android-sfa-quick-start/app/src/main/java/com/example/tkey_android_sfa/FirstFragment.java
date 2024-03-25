package com.example.tkey_android_sfa;
import static android.content.ContentValues.TAG;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;

import com.example.tkey_android_sfa.databinding.FragmentFirstBinding;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.android.material.snackbar.Snackbar;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GetTokenResult;
import com.web3auth.singlefactorauth.SingleFactorAuth;
import com.web3auth.singlefactorauth.types.LoginParams;
import com.web3auth.singlefactorauth.types.SingleFactorAuthArgs;
import com.web3auth.singlefactorauth.types.TorusKey;
import com.web3auth.tkey.RuntimeError;
import com.web3auth.tkey.ThresholdKey.Common.PrivateKey;
import com.web3auth.tkey.ThresholdKey.Common.Result;
import com.web3auth.tkey.ThresholdKey.GenerateShareStoreResult;
import com.web3auth.tkey.ThresholdKey.KeyDetails;
import com.web3auth.tkey.ThresholdKey.KeyReconstructionDetails;
import com.web3auth.tkey.ThresholdKey.Modules.PrivateKeysModule;
import com.web3auth.tkey.ThresholdKey.Modules.SecurityQuestionModule;
import com.web3auth.tkey.ThresholdKey.Modules.SeedPhraseModule;
import com.web3auth.tkey.ThresholdKey.Modules.ShareSerializationModule;
import com.web3auth.tkey.ThresholdKey.ServiceProvider;
import com.web3auth.tkey.ThresholdKey.StorageLayer;
import com.web3auth.tkey.ThresholdKey.ThresholdKey;
import org.torusresearch.fetchnodedetails.types.TorusNetwork;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class FirstFragment extends Fragment {

    private FragmentFirstBinding binding;
    private SingleFactorAuth singleFactorAuth;
    private FirebaseAuth firebaseAuth;

    //    To be used for saving/reading data from shared prefs
    private final String SHARE_ALIAS = "SHARE";

    private final String SHARE_INDEX_GENERATED_ALIAS = "SHARE_INDEX_GENERATED_ALIAS";
    private final String ADD_PASSWORD_SET_ALIAS = "ADD_PASSWORD_SET_ALIAS";

    private final String SEED_PHRASE_SET_ALIAS = "SEED_PHRASE_SET_ALIAS";
    private final String SEED_PHRASE_ALIAS = "SEED_PHRASE_ALIAS";

    @Override
    public View onCreateView(
            @NonNull LayoutInflater inflater, ViewGroup container,
            Bundle savedInstanceState
    ) {
        binding = FragmentFirstBinding.inflate(inflater, container, false);
        firebaseAuth = FirebaseAuth.getInstance();
        return binding.getRoot();
    }

    private void showLoading() {
        requireActivity().runOnUiThread(() -> {
            ProgressBar pb = binding.loadingIndicator;
            pb.setVisibility(View.VISIBLE);
        });
    }

    private void hideLoading() {
        requireActivity().runOnUiThread(() -> {
            ProgressBar pb = binding.loadingIndicator;
            pb.setVisibility(View.GONE);
        });
    }

    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        MainActivity activity = ((MainActivity) requireActivity());

        userHasNotLoggedInWithGoogle();
        this.singleFactorAuth =  new SingleFactorAuth(new SingleFactorAuthArgs(TorusNetwork.CYAN));

        binding.googleLogin.setOnClickListener(view1 -> {
            showLoading();
            try {
                firebaseAuth.signInWithEmailAndPassword("tkey-sfa@gmail.com", "demo1234")
                        .addOnCompleteListener(new OnCompleteListener<AuthResult>() {
                            @Override
                            public void onComplete(@NonNull Task<AuthResult> task) {
                                FirebaseUser user = firebaseAuth.getCurrentUser();
                                assert user != null;
                                user.getIdToken(true).addOnCompleteListener(new OnCompleteListener<GetTokenResult>() {
                                    @Override
                                    public void onComplete(@NonNull Task<GetTokenResult> task) {
                                        String idToken = task.getResult().getToken();

                                        Log.d(TAG, "GetTokenResult result =" + idToken);
                                        assert idToken != null;
                                        if (!idToken.isEmpty()) {

                                            assert user.getEmail() != null;
                                            LoginParams loginParams =
                                                    new LoginParams("web3auth-firebase-examples", user.getEmail(), idToken);

                                            try {
                                                TorusKey torusKey = singleFactorAuth.getKey(
                                                        loginParams,
                                                        getActivity(),
                                                        86400
                                                ).get();
                                                assert torusKey.getPrivateKey() != null;
                                                activity.postboxKey = torusKey.getPrivateKey().toString(16);
                                                String publicAddress = torusKey.getPublicAddress();
                                                binding.resultView.append("publicAddress: " + publicAddress);
                                                hideLoading();
                                                userHasLoggedInWithGoogle();
                                                // IMP END - Get Key
                                            } catch (Exception e) {
                                                hideLoading();
                                                Log.d(TAG, "Error:" + e.getLocalizedMessage());
                                            }


                                        }

                                    }
                                });

                            }
                        });

       } catch (Exception e) {
                // CustomAuth failed, cannot continue
                throw new RuntimeException(e);
            }
        });
        binding.createThresholdKey.setOnClickListener(view1 -> {
            showLoading();
            try {
                activity.tkeyStorage = new StorageLayer(false, "https://metadata.tor.us", 2);
                activity.tkeyProvider = new ServiceProvider(false, activity.postboxKey);
                activity.appKey = new ThresholdKey(null, null, activity.tkeyStorage, activity.tkeyProvider, null, null, false, false);

                // 1. Fetch locally available share
                String share = activity.sharedpreferences.getString(SHARE_ALIAS, null);
                activity.appKey.initialize(activity.postboxKey, null, false, false, result -> {
                    if (result instanceof Result.Error) {
                        Exception e = ((Result.Error<KeyDetails>) result).exception;
                        renderError(e);
                    } else if (result instanceof Result.Success) {
                        KeyDetails details = ((Result.Success<KeyDetails>) result).data;
                        if (share == null) {
                            // 2. If no shares, then assume new user and try initialize and reconstruct. If success, save share, if fail prompt to reset account
                            activity.appKey.reconstruct(reconstruct_result -> {
                                if (reconstruct_result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                                    renderError(((Result.Error<KeyReconstructionDetails>) reconstruct_result).exception);
                                } else if (reconstruct_result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                                    KeyReconstructionDetails reconstructionDetails = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<KeyReconstructionDetails>) reconstruct_result).data;
                                    requireActivity().runOnUiThread(() -> {
                                        try {
                                            renderTKeyDetails(reconstructionDetails, details);
                                            userHasCreatedTkey();
                                            // Persist the share
                                            List<String> filters = new ArrayList<>();
                                            filters.add("1");
                                            ArrayList<String> indexes = activity.appKey.getShareIndexes();
                                            indexes.removeAll(filters);
                                            String index = indexes.get(0);
                                            String shareToSave = activity.appKey.outputShare(index, null);
                                            SharedPreferences.Editor editor = activity.sharedpreferences.edit();
                                            editor.putString(SHARE_ALIAS, shareToSave);
                                            editor.apply();
                                            hideLoading();

                                        } catch (RuntimeError | JSONException e) {
                                            renderError(e);
                                            hideLoading();
                                        }
                                    });
                                }
                            });
                        } else {
                            // 3. If shares are found, insert them into tkey and then try reconstruct. If success, all good, if fail then share is incorrect, go to prompt to reset account
                            activity.appKey.inputShare(share, null, input_share_result -> {
                                if (input_share_result instanceof Result.Error) {
                                    renderError(((Result.Error<Void>) input_share_result).exception);
                                } else if (input_share_result instanceof Result.Success) {
                                    activity.appKey.reconstruct(reconstruct_result_after_import -> {
                                        if (reconstruct_result_after_import instanceof Result.Error) {
                                            renderError(((Result.Error<KeyReconstructionDetails>) reconstruct_result_after_import).exception);
                                        } else if (reconstruct_result_after_import instanceof Result.Success) {
                                            KeyReconstructionDetails reconstructionDetails = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<KeyReconstructionDetails>) reconstruct_result_after_import).data;
                                            requireActivity().runOnUiThread(() -> {
                                                renderTKeyDetails(reconstructionDetails, details);
                                                userHasCreatedTkey();
                                                hideLoading();
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            } catch (RuntimeError | RuntimeException e) {
                renderError(e);
            }
        });

        binding.reconstructThresholdKey.setOnClickListener(view1 -> activity.appKey.reconstruct(result -> {
            showLoading();
            if (result instanceof Result.Error) {
                renderError(((Result.Error<KeyReconstructionDetails>) result).exception);
                hideLoading();
            } else if (result instanceof Result.Success) {
                requireActivity().runOnUiThread(() -> {
                    try {
                        KeyReconstructionDetails details = ((Result.Success<KeyReconstructionDetails>) result).data;
                        binding.generateNewShare.setEnabled(true);
                        Snackbar snackbar = Snackbar.make(view1, details.getKey(), Snackbar.LENGTH_LONG);
                        snackbar.show();
                    } catch (RuntimeError e) {
                        renderError(e);
                    } finally {
                        hideLoading();
                    }
                });
            }
        }));

        binding.generateNewShare.setOnClickListener(view1 -> {
            showLoading();
            try {
                activity.appKey.generateNewShare(result -> {
                    if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                        requireActivity().runOnUiThread(() -> {
                            Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<GenerateShareStoreResult>) result).exception;
                            Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e.toString(), Snackbar.LENGTH_LONG);
                            snackbar.show();
                            hideLoading();
                        });
                    } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                        requireActivity().runOnUiThread(() -> {
                            try {
                                GenerateShareStoreResult share = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<GenerateShareStoreResult>) result).data;
                                String shareIndexCreated = share.getIndex();
                                activity.sharedpreferences.edit().putString(SHARE_INDEX_GENERATED_ALIAS, shareIndexCreated).apply();
                                binding.deleteShare.setEnabled(true);
                                Snackbar snackbar = Snackbar.make(view1, share.getIndex() + "created", Snackbar.LENGTH_LONG);
                                snackbar.show();

                                // update result view
                                activity.appKey.reconstruct((reconstructionDetailsResult) -> {
                                    try {
                                        if (reconstructionDetailsResult instanceof Result.Error) {
                                            hideLoading();
                                            renderError(((Result.Error<KeyReconstructionDetails>) reconstructionDetailsResult).exception);
                                        } else if (reconstructionDetailsResult instanceof Result.Success) {
                                            KeyDetails details = activity.appKey.getKeyDetails();
                                            renderTKeyDetails(((Result.Success<KeyReconstructionDetails>) reconstructionDetailsResult).data, details);
                                            hideLoading();
                                        }

                                    } catch (RuntimeError e) {
                                        hideLoading();
                                        renderError(e);
                                    }

                                });
                            } catch (RuntimeError e) {
                                renderError(e);
                                hideLoading();
                            }
                        });
                    }
                });
            } catch (Exception e) {
                renderError(e);
            }
        });

        binding.deleteShare.setOnClickListener(view1 -> {
            showLoading();
            String shareIndexCreated = activity.sharedpreferences.getString(SHARE_INDEX_GENERATED_ALIAS, null);
            if(shareIndexCreated != null) {
                activity.appKey.deleteShare(shareIndexCreated, result -> {
                    if (result instanceof Result.Error) {
                        requireActivity().runOnUiThread(() -> {
                            Exception e = ((Result.Error<Void>) result).exception;
                            renderError(e);
                            hideLoading();
                        });
                    } else if (result instanceof Result.Success) {
                        requireActivity().runOnUiThread(() -> {
                            binding.resetAccount.setEnabled(true);
                            Snackbar snackbar;
                            snackbar = Snackbar.make(view1, shareIndexCreated + " deleted", Snackbar.LENGTH_LONG);
                            snackbar.show();
                        });
                        // update result view
                        activity.appKey.reconstruct((reconstructionDetailsResult) -> {
                            try {
                                if (reconstructionDetailsResult instanceof Result.Error) {
                                    hideLoading();
                                    renderError(((Result.Error<KeyReconstructionDetails>) reconstructionDetailsResult).exception);
                                } else if (reconstructionDetailsResult instanceof Result.Success) {
                                    KeyDetails details = activity.appKey.getKeyDetails();
                                    requireActivity().runOnUiThread(() -> {
                                        renderTKeyDetails(((Result.Success<KeyReconstructionDetails>) reconstructionDetailsResult).data, details);
                                        hideLoading();
                                        binding.deleteShare.setEnabled(false);
                                    });
                                }
                            } catch (RuntimeError e) {
                                renderError(e);
                                hideLoading();
                            }

                        });

                    }
                });
            } else {
                requireActivity().runOnUiThread(() -> {
                    Snackbar snackbar;
                    snackbar = Snackbar.make(view1, "No share index found", Snackbar.LENGTH_LONG);
                    snackbar.show();
                });
            }
        });

        binding.addPassword.setOnClickListener(view1 -> {
            showLoading();
            try {
                String question = "what's your password?";
                String answer = generateRandomPassword(12);
                SecurityQuestionModule.generateNewShare(activity.appKey, question, answer, result -> {
                    if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                        requireActivity().runOnUiThread(() -> {
                            Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<GenerateShareStoreResult>) result).exception;
                            Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e.toString(), Snackbar.LENGTH_LONG);
                            snackbar.show();
                            hideLoading();
                        });
                    } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                        requireActivity().runOnUiThread(() -> {
                            try {
                                GenerateShareStoreResult share = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<GenerateShareStoreResult>) result).data;
                                String setAnswer = SecurityQuestionModule.getAnswer(activity.appKey);
                                binding.addPassword.setEnabled(false);
                                binding.changePassword.setEnabled(true);
                                Snackbar snackbar = Snackbar.make(view1, "Added password " + setAnswer + " for share index" + share.getIndex(), Snackbar.LENGTH_LONG);
                                snackbar.show();
                                activity.sharedpreferences.edit().putString(ADD_PASSWORD_SET_ALIAS, "SET").apply();
                                // update result view
                                activity.appKey.reconstruct((reconstructionDetailsResult) -> {
                                    try {
                                        if (reconstructionDetailsResult instanceof Result.Error) {
                                            hideLoading();
                                            renderError(((Result.Error<KeyReconstructionDetails>) reconstructionDetailsResult).exception);
                                        } else if (reconstructionDetailsResult instanceof Result.Success) {
                                            KeyDetails details = activity.appKey.getKeyDetails();
                                            renderTKeyDetails(((Result.Success<KeyReconstructionDetails>) reconstructionDetailsResult).data, details);
                                            hideLoading();
                                        }
                                    } catch (RuntimeError e) {
                                        hideLoading();
                                        renderError(e);
                                    }

                                });
                            } catch (RuntimeError e) {
                                Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e, Snackbar.LENGTH_LONG);
                                snackbar.show();
                                hideLoading();
                            }
                        });
                    }
                });
            } catch (Exception e) {
                Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e, Snackbar.LENGTH_LONG);
                snackbar.show();
                hideLoading();
            }
        });

        binding.changePassword.setOnClickListener(view1 -> {
            AlertDialog.Builder builder = new AlertDialog.Builder(getContext());
            builder.setTitle("Enter Password");

            // Create an EditText for password input
            final EditText passwordEditText = new EditText(getContext());
            passwordEditText.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
            builder.setView(passwordEditText);

            builder.setPositiveButton("OK", (dialog, which) -> {
                String password = passwordEditText.getText().toString();
                // Handle the entered password
                showLoading();
                try {
                    String question = "what's your password?";
                    SecurityQuestionModule.changeSecurityQuestionAndAnswer(activity.appKey, question, password, result -> {
                        if (result instanceof Result.Error) {
                            requireActivity().runOnUiThread(() -> {
                                renderError(((Result.Error<Boolean>) result).exception);
                                hideLoading();
                            });
                        } else if (result instanceof Result.Success) {
                            requireActivity().runOnUiThread(() -> {
                                try {
                                    Boolean changed = ((Result.Success<Boolean>) result).data;
                                    if (changed) {
                                        String setAnswer = SecurityQuestionModule.getAnswer(activity.appKey);
                                        binding.changePassword.setEnabled(false);
                                        Snackbar snackbar = Snackbar.make(view1, "Password changed to" + setAnswer, Snackbar.LENGTH_LONG);
                                        snackbar.show();
                                        hideLoading();
                                    } else {
                                        Snackbar snackbar = Snackbar.make(view1, "Password failed to be changed", Snackbar.LENGTH_LONG);
                                        snackbar.show();
                                        hideLoading();
                                    }
                                } catch (RuntimeError e) {
                                    Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e, Snackbar.LENGTH_LONG);
                                    snackbar.show();
                                    hideLoading();
                                }
                            });
                        }
                    });
                } catch (Exception e) {
                    renderError(e);
                    hideLoading();
                }
            });

            builder.setNegativeButton("Cancel", (dialog, which) -> dialog.cancel());
            AlertDialog dialog = builder.create();
            dialog.show();
        });

        binding.showPassword.setOnClickListener(view1 -> {
            try {
                String answer = SecurityQuestionModule.getAnswer(activity.appKey);
                Snackbar snackbar = Snackbar.make(view1, "Password currently is " + answer, Snackbar.LENGTH_LONG);
                snackbar.show();
            } catch (RuntimeError e) {
                renderError(e);

            }
        });

        binding.setSeedPhrase.setOnClickListener(view1 -> {
            showLoading();
            String phrase = "seed sock milk update focus rotate barely fade car face mechanic mercy";
            SeedPhraseModule.setSeedPhrase(activity.appKey, "HD Key Tree", phrase, 0, result -> {
                if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                    requireActivity().runOnUiThread(() -> {
                        Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<Boolean>) result).exception;
                        Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e.toString(), Snackbar.LENGTH_LONG);
                        snackbar.show();
                        hideLoading();
                    });
                } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                    Boolean set = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<Boolean>) result).data;
                    if (set) {
                        activity.sharedpreferences.edit().putString(SEED_PHRASE_ALIAS, phrase).apply();
                        requireActivity().runOnUiThread(() -> {
                            Snackbar snackbar;
                            snackbar = Snackbar.make(view1, "Seed phrase set", Snackbar.LENGTH_LONG);
                            snackbar.show();
                        });
                        activity.sharedpreferences.edit().putString(SEED_PHRASE_SET_ALIAS, "SET").apply();
                        // update result view
                        activity.appKey.reconstruct((reconstructionDetailsResult) -> {
                            try {
                                if (reconstructionDetailsResult instanceof Result.Error) {
                                    renderError(((Result.Error<KeyReconstructionDetails>) reconstructionDetailsResult).exception);
                                    hideLoading();
                                } else if (reconstructionDetailsResult instanceof Result.Success) {
                                    KeyDetails details = activity.appKey.getKeyDetails();
                                    requireActivity().runOnUiThread(() -> {
                                        binding.setSeedPhrase.setEnabled(false);
                                        binding.changeSeedPhrase.setEnabled(true);
                                        binding.deleteSeedPhrase.setEnabled(true);
                                    });
                                    renderTKeyDetails(((Result.Success<KeyReconstructionDetails>) reconstructionDetailsResult).data, details);
                                    hideLoading();
                                }

                            } catch (RuntimeError e) {
                                hideLoading();
                                renderError(e);
                            }

                        });
                    } else {
                        requireActivity().runOnUiThread(() -> {
                            Snackbar snackbar;
                            snackbar = Snackbar.make(view1, "Failed to set seed phrase", Snackbar.LENGTH_LONG);
                            snackbar.show();
                        });
                    }
                }
            });
        });

        binding.changeSeedPhrase.setOnClickListener(view1 -> {
            showLoading();
            String oldPhrase = "seed sock milk update focus rotate barely fade car face mechanic mercy";
            String newPhrase = "object brass success calm lizard science syrup planet exercise parade honey impulse";
            SeedPhraseModule.changePhrase(activity.appKey, oldPhrase, newPhrase, result -> {
                if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                    requireActivity().runOnUiThread(() -> {
                        Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<Boolean>) result).exception;
                        renderError(e);
                        hideLoading();
                    });
                } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                    Boolean changed = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<Boolean>) result).data;
                    if (changed) {
                        activity.sharedpreferences.edit().putString(SEED_PHRASE_ALIAS, newPhrase).apply();
                        requireActivity().runOnUiThread(() -> {
                            Snackbar snackbar = Snackbar.make(view1, "Seed phrase changed", Snackbar.LENGTH_LONG);
                            snackbar.show();
                            binding.changeSeedPhrase.setEnabled(false);
                            binding.deleteSeedPhrase.setEnabled(true);
                        });
                        hideLoading();
                    } else {
                        requireActivity().runOnUiThread(() -> {
                            Snackbar snackbar = Snackbar.make(view1, "Failed to change seed phrase", Snackbar.LENGTH_LONG);
                            snackbar.show();
                        });
                        hideLoading();
                    }
                }
            });
        });

        binding.getSeedPhrase.setOnClickListener(view1 -> {
            try {
                String phrases = SeedPhraseModule.getPhrases(activity.appKey);
                Snackbar snackbar = Snackbar.make(view1, phrases, Snackbar.LENGTH_LONG);
                snackbar.show();
            } catch (RuntimeError e) {
                renderError(e);
            }
        });

        binding.resetAccount.setOnClickListener(view1 -> {
            try {
                // delete locally stored share
                StorageLayer temp_sl = new StorageLayer(false, "https://metadata.tor.us", 2);
                ServiceProvider temp_sp = new ServiceProvider(false, activity.postboxKey);
                ThresholdKey temp_key = new ThresholdKey(null, null, temp_sl, temp_sp, null, null, false, false);

                activity.sharedpreferences.edit().clear().apply();

                temp_key.storage_layer_set_metadata(activity.postboxKey, "{ \"message\": \"KEY_NOT_FOUND\" }", result -> {
                    if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                        activity.runOnUiThread(() -> {
                            Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<Void>) result).exception;
                            renderError(e);
                        });
                    } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                        activity.runOnUiThread(() -> {
                            activity.resetState();
                            userHasNotLoggedInWithGoogle();
                            binding.resultView.setText("");
                            Snackbar snackbar = Snackbar.make(view1, "Account reset successful", Snackbar.LENGTH_LONG);
                            snackbar.show();
                        });

                    }
                });

                activity.postboxKey = null;

            } catch (RuntimeError e) {
                Snackbar snackbar = Snackbar.make(view1, "A problem occurred: " + e.getMessage(), Snackbar.LENGTH_LONG);
                snackbar.show();
            }
        });

        binding.deleteSeedPhrase.setOnClickListener(view1 -> {
            showLoading();
            try {
                String newPhrase = "object brass success calm lizard science syrup planet exercise parade honey impulse";
                String phrase = activity.sharedpreferences.getString(SEED_PHRASE_ALIAS, newPhrase);
                SeedPhraseModule.deletePhrase(activity.appKey, phrase, result -> {
                    if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                        requireActivity().runOnUiThread(() -> {
                            Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<Boolean>) result).exception;
                            renderError(e);
                        });
                    } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                        Boolean deleted = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<Boolean>) result).data;
                        if (deleted) {
                            // update result view
                            activity.appKey.reconstruct((reconstructionDetailsResult) -> {
                                try {
                                    if (reconstructionDetailsResult instanceof Result.Error) {
                                        hideLoading();
                                        renderError(((Result.Error<KeyReconstructionDetails>) reconstructionDetailsResult).exception);
                                    } else if (reconstructionDetailsResult instanceof Result.Success) {
                                        KeyDetails details = activity.appKey.getKeyDetails();
                                        requireActivity().runOnUiThread(() -> {
                                            binding.deleteSeedPhrase.setEnabled(false);
                                            binding.setSeedPhrase.setEnabled(true);
                                            binding.changeSeedPhrase.setEnabled(false);
                                            binding.getSeedPhrase.setEnabled(false);
                                        });
                                        renderTKeyDetails(((Result.Success<KeyReconstructionDetails>) reconstructionDetailsResult).data, details);
                                        hideLoading();
                                    }

                                } catch (RuntimeError e) {
                                    hideLoading();
                                    renderError(e);
                                }

                            });
                            requireActivity().runOnUiThread(() -> {
                                Snackbar snackbar = Snackbar.make(view1, "Phrase Deleted", Snackbar.LENGTH_LONG);
                                snackbar.show();
                                hideLoading();
                            });
                        } else {
                            requireActivity().runOnUiThread(() -> {
                                Snackbar snackbar = Snackbar.make(view1, "Phrase failed ot be deleted", Snackbar.LENGTH_LONG);
                                snackbar.show();
                                hideLoading();
                            });
                        }
                    }
                });
            } catch (Exception e) {
                renderError(e);
            }
        });

        binding.exportShare.setOnClickListener(view1 -> activity.appKey.generateNewShare(result -> {
            showLoading();
            if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                requireActivity().runOnUiThread(() -> {
                    Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<GenerateShareStoreResult>) result).exception;
                    renderError(e);
                    hideLoading();
                });
            } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                requireActivity().runOnUiThread(() -> {
                    try {
                        GenerateShareStoreResult shareStoreResult = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<GenerateShareStoreResult>) result).data;
                        String index = shareStoreResult.getIndex();
                        String share = activity.appKey.outputShare(index, null);
                        String serialized = ShareSerializationModule.serializeShare(activity.appKey, share, null);
                        Snackbar snackbar = Snackbar.make(view1, "Serialization result: " + serialized, Snackbar.LENGTH_LONG);
                        snackbar.show();
                        hideLoading();
                    } catch (RuntimeError e) {
                        renderError(e);
                        hideLoading();
                    }
                });
            }
        }));

        binding.setPrivateKey.setOnClickListener(view1 -> {
            showLoading();
            try {
                PrivateKey newKey = PrivateKey.generate();
                PrivateKeysModule.setPrivateKey(activity.appKey, newKey.hex, "secp256k1n", result -> {
                    if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Error) {
                        requireActivity().runOnUiThread(() -> {
                            Exception e = ((com.web3auth.tkey.ThresholdKey.Common.Result.Error<Boolean>) result).exception;
                            renderError(e);
                            hideLoading();
                        });
                    } else if (result instanceof com.web3auth.tkey.ThresholdKey.Common.Result.Success) {
                        Boolean set = ((com.web3auth.tkey.ThresholdKey.Common.Result.Success<Boolean>) result).data;
                        Snackbar snackbar = Snackbar.make(view1, "Set private key result: " + set, Snackbar.LENGTH_LONG);
                        snackbar.show();
                        hideLoading();
                    }
                });
            } catch (RuntimeError e) {
                renderError(e);
                hideLoading();
            }
        });

        binding.getPrivateKey.setOnClickListener(view1 -> {
            showLoading();
            try {
                String key = PrivateKeysModule.getPrivateKeys(activity.appKey);
                Snackbar snackbar = Snackbar.make(view1, key, Snackbar.LENGTH_LONG);
                snackbar.show();
                hideLoading();
            } catch (RuntimeError e) {
                renderError(e);
                hideLoading();
            }
        });

        binding.getAccounts.setOnClickListener(view1 -> {
            showLoading();
            try {
                ArrayList<String> accounts = PrivateKeysModule.getPrivateKeyAccounts(activity.appKey);
                Snackbar snackbar = Snackbar.make(view1, accounts.toString(), Snackbar.LENGTH_LONG);
                snackbar.show();
                hideLoading();
            } catch (RuntimeError | JSONException e) {
                renderError(e);
                hideLoading();
            }
        });

        binding.getKeyDetails.setOnClickListener(view1 -> {
            try {
                KeyDetails keyDetails = activity.appKey.getKeyDetails();
                String snackbarContent = "There are " + (keyDetails.getTotalShares()) + " available shares. " + (keyDetails.getRequiredShares()) + " are required to reconstruct the private key";
                Snackbar snackbar = Snackbar.make(view1, snackbarContent, Snackbar.LENGTH_LONG);
                snackbar.show();
            } catch (RuntimeError e) {
                renderError(e);
            }
        });
    }

    private void renderError(Throwable error) {
        requireActivity().runOnUiThread(() -> {
//            Throwable reason = Helpers.unwrapCompletionException(error);
            TextView textView = binding.resultView;
//            if (reason instanceof UserCancelledException || reason instanceof NoAllowedBrowserFoundException) {
//                textView.setText(error.getMessage());
//            } else {
//                String errorMessage = getResources().getString(R.string.error_message, error.getMessage());
//                textView.setText(errorMessage);
//            }
        });
    }

    private void userHasNotLoggedInWithGoogle() {
        requireActivity().runOnUiThread(() -> {
            binding.googleLogin.setVisibility(View.VISIBLE);
            binding.googleLogin.setEnabled(true);

            binding.createThresholdKey.setVisibility(View.GONE);
            binding.reconstructThresholdKey.setVisibility(View.GONE);
            binding.generateNewShare.setVisibility(View.GONE);
            binding.deleteShare.setVisibility(View.GONE);
            binding.deleteSeedPhrase.setVisibility(View.GONE);
            binding.resetAccount.setVisibility(View.GONE);
            binding.getKeyDetails.setVisibility(View.GONE);
            binding.addPassword.setVisibility(View.GONE);
            binding.changePassword.setVisibility(View.GONE);
            binding.showPassword.setVisibility(View.GONE);
            binding.setSeedPhrase.setVisibility(View.GONE);
            binding.deleteSeedPhrase.setVisibility(View.GONE);
            binding.exportShare.setVisibility(View.GONE);
            binding.getPrivateKey.setVisibility(View.GONE);
            binding.setPrivateKey.setVisibility(View.GONE);
            binding.changeSeedPhrase.setVisibility(View.GONE);
            binding.getSeedPhrase.setVisibility(View.GONE);
            binding.getAccounts.setVisibility(View.GONE);
            binding.divider.setVisibility(View.GONE);
            binding.divider2.setVisibility(View.GONE);
            binding.divider3.setVisibility(View.GONE);
            binding.divider4.setVisibility(View.GONE);
            binding.divider5.setVisibility(View.GONE);
            binding.securityQuestionText.setVisibility(View.GONE);
            binding.seedPhraseText.setVisibility(View.GONE);
            binding.shareSerializationText.setVisibility(View.GONE);
            binding.privateKeyText.setVisibility(View.GONE);
        });
    }

    private void userHasLoggedInWithGoogle() {
        requireActivity().runOnUiThread(() -> {
            binding.googleLogin.setVisibility(View.GONE);
            binding.createThresholdKey.setVisibility(View.VISIBLE);
            binding.resetAccount.setVisibility(View.VISIBLE);
        });
    }

    private void userHasCreatedTkey() {
        MainActivity activity = (MainActivity) requireActivity();
        requireActivity().runOnUiThread(() -> {
            binding.createThresholdKey.setVisibility(View.GONE);
            binding.reconstructThresholdKey.setVisibility(View.VISIBLE);
            binding.generateNewShare.setVisibility(View.VISIBLE);
            binding.deleteShare.setVisibility(View.VISIBLE);
            binding.deleteShare.setEnabled(activity.sharedpreferences.getString(SHARE_INDEX_GENERATED_ALIAS, null) != null);
            binding.deleteSeedPhrase.setVisibility(View.VISIBLE);
            binding.resetAccount.setVisibility(View.VISIBLE);
            binding.getKeyDetails.setVisibility(View.VISIBLE);
            binding.addPassword.setVisibility(View.VISIBLE);
            binding.addPassword.setEnabled(!activity.sharedpreferences.getString(ADD_PASSWORD_SET_ALIAS, "").equals("SET"));
            binding.changePassword.setVisibility(View.VISIBLE);
            binding.showPassword.setVisibility(View.VISIBLE);
            binding.setSeedPhrase.setVisibility(View.VISIBLE);
            binding.setSeedPhrase.setEnabled(!activity.sharedpreferences.getString(SEED_PHRASE_SET_ALIAS, "").equals("SET"));
            binding.deleteSeedPhrase.setVisibility(View.VISIBLE);
            binding.exportShare.setVisibility(View.VISIBLE);
            binding.getPrivateKey.setVisibility(View.VISIBLE);
            binding.setPrivateKey.setVisibility(View.VISIBLE);
            binding.changeSeedPhrase.setVisibility(View.VISIBLE);
            binding.getSeedPhrase.setVisibility(View.VISIBLE);
            binding.getAccounts.setVisibility(View.VISIBLE);
            binding.divider.setVisibility(View.VISIBLE);
            binding.divider2.setVisibility(View.VISIBLE);
            binding.divider3.setVisibility(View.VISIBLE);
            binding.divider4.setVisibility(View.VISIBLE);
            binding.divider5.setVisibility(View.VISIBLE);
            binding.securityQuestionText.setVisibility(View.VISIBLE);
            binding.seedPhraseText.setVisibility(View.VISIBLE);
            binding.shareSerializationText.setVisibility(View.VISIBLE);
            binding.privateKeyText.setVisibility(View.VISIBLE);
        });
    }

    private void renderTKeyDetails(KeyReconstructionDetails reconstructionDetails, KeyDetails details) {
        requireActivity().runOnUiThread(() -> {
            try {
                binding.resultView.setText("");
                binding.resultView.append("Final Key\n");
                binding.resultView.append(reconstructionDetails.getKey() + "\n");
                binding.resultView.append("Total Shares: " + details.getTotalShares() + "\n");
                binding.resultView.append("Required Shares: " + details.getThreshold() + "\n");
            } catch (RuntimeError e) {
                renderError(e);
            }
        });

    }

    public String generateRandomPassword(int length) {
        // Define the characters from which the password will be formed
        String allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

        Random random = new Random();
        StringBuilder password = new StringBuilder();

        // Generate the password by randomly selecting characters from the allowedChars string
        for (int i = 0; i < length; i++) {
            int randomIndex = random.nextInt(allowedChars.length());
            char randomChar = allowedChars.charAt(randomIndex);
            password.append(randomChar);
        }

        return password.toString();
    }


    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

}