import React, { useEffect } from "react";

const AdSense = () => {
    useEffect(() => {
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
        document.body.appendChild(script);

        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Error:", e);
        }
    }, []);

    return (
        <div>
            <ins className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
        </div>
    );
};

export default AdSense;

