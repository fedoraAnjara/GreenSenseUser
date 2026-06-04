import { createContext, useContext, useState } from "react";
import { translations } from "../translations";


const languageContext = createContext({});

export function LanguageProvider({children}) {
    const [language, setLanguage] = useState("fr");

    const t = translations[language];

    const toggleLanguage = () =>{
        setLanguage((prev) => (prev=== "fr"?"en":"fr"));
    };

    return(
        <languageContext.Provider value={{language, toggleLanguage, t}}>
            {children}
        </languageContext.Provider>
    );

}
export const useLanguage = () => useContext(languageContext);