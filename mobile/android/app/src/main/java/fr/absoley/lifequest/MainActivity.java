package fr.absoley.lifequest;

import android.os.Bundle;

import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fond de marque, clair ou sombre selon le système, plutôt que le blanc
        // par défaut de la WebView : rien ne clignote avant le premier rendu.
        getBridge().getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.app_background));
    }
}
