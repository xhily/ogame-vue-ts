package games.wenzi.ogame;

import android.os.Bundle;
import android.view.Window;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 设置状态栏颜色，防止 Capacitor 强制透明
        Window window = getWindow();
        window.setStatusBarColor(ContextCompat.getColor(this, R.color.status_bar_color));
        window.setNavigationBarColor(ContextCompat.getColor(this, R.color.status_bar_color));
    }
}
