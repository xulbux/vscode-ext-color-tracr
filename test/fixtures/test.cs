// C# test fixture for Color Tracr

using System.Drawing;

class ThemeColors
{
    /************** Color.FromArgb(A, R, G, B); 4 Args *************/

    Color primary = Color.FromArgb(255, 150, 112, 255);
    Color transparent = Color.FromArgb(128, 150, 112, 255);
    Color halfAlpha = Color.FromArgb(127, 255, 0, 0);

    /*************** Color.FromArgb(R, G, B); 3 Args ***************/

    Color solidRed = Color.FromArgb(255, 0, 0);
    Color solidBlue = Color.FromArgb(0, 0, 255);
    Color custom = Color.FromArgb(100, 200, 50);

    /************************** Edge Cases *************************/

    Color almostTransparent = Color.FromArgb(1, 255, 255, 255);
    Color black = Color.FromArgb(0, 0, 0);
    Color white = Color.FromArgb(255, 255, 255);
}
