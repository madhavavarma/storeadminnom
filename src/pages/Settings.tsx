import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { supabase } from "@/supabaseClient";
import { getAppSettings } from "./api";
import type { IAppSettings } from "@/interfaces/IAppSettings";

interface SettingsProps {
  refreshKey?: number;
}

export default function Settings({ refreshKey }: SettingsProps) {
  const [settings, setSettings] = useState<IAppSettings | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const prevLogoUrl = useRef<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setIsLoggedIn(true);
        getAppSettings()
          .then((data: IAppSettings) => {
            // Defensive: ensure all array fields exist and are arrays
            const safeData = {
              ...data,
              branding: {
                ...data?.branding,
                nav: {
                  contact: Array.isArray(data?.branding?.nav?.contact) ? data.branding.nav.contact : [],
                  faq: Array.isArray(data?.branding?.nav?.faq) ? data.branding.nav.faq : [],
                },
                slides: Array.isArray(data?.branding?.slides) ? data.branding.slides : [],
                features: Array.isArray(data?.branding?.features) ? data.branding.features : [],
                homeCarousels: Array.isArray(data?.branding?.homeCarousels) ? data.branding.homeCarousels : [],
              },
            };
            setSettings(safeData);
            prevLogoUrl.current = safeData?.logoUrl;
            setLogoPreview(safeData?.logoUrl || "");
            setLoading(false);
          })
          .catch(() => {
            // If failed, still set an empty object so UI is editable
            setSettings({});
            setError("Failed to load settings");
            setLoading(false);
          });
      } else {
        setIsLoggedIn(false);
        setSettings(null);
        setLoading(false);
      }
    });
    // Listen for signout event to clear settings
    const clear = () => {
      setSettings(null);
      setLogoPreview("");
      setSelectedLogo(null);
    };
    window.addEventListener("clearOrders", clear);
    return () => window.removeEventListener("clearOrders", clear);
  }, [refreshKey]);

  // Handle changes (top-level + nested)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!settings) return;
    const { name, value, dataset } = e.target;

  // Logo (file input handled separately)

    // Branding
    if (dataset.section === "branding") {
      setSettings({
        ...settings,
        branding: { ...settings.branding, [name]: value },
      });
      return;
    }

    // Menu
    if (dataset.section === "menu") {
      setSettings({
        ...settings,
        branding: {
          ...settings.branding,
          menu: { ...settings.branding?.menu, [name]: value },
        },
      });
      return;
    }

    // Nav
    if (dataset.section === "nav") {
      const navType = dataset.navtype as "contact" | "faq";
      const idx = Number(dataset.idx);
      const field = dataset.field;
      const navArr = settings.branding?.nav?.[navType]?.map((item, i) =>
        i === idx ? { ...item, [field!]: value } : item
      );
      setSettings({
        ...settings,
        branding: {
          ...settings.branding,
          nav: { ...settings.branding?.nav, [navType]: navArr },
        },
      });
      return;
    }

    // Slides, features, carousels
    if (
      dataset.section === "slides" ||
      dataset.section === "features" ||
      dataset.section === "homeCarousels"
    ) {
      const arrName = dataset.section as
        | "slides"
        | "features"
        | "homeCarousels";
      const idx = Number(dataset.idx);
      const field = dataset.field;
      const arr = (settings.branding?.[arrName] || []).map((item, i) =>
        i === idx ? { ...item, [field!]: value } : item
      );
      setSettings({
        ...settings,
        branding: { ...settings.branding, [arrName]: arr },
      });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    let newLogoUrl = settings.logoUrl;
    let oldLogoUrl = prevLogoUrl.current;
    try {
      // If a new logo is selected, upload it
      if (selectedLogo) {
        // Remove old logo from storage if present
        if (oldLogoUrl) {
          const splitStr = '/object/public/storeadmin/';
          const idx = oldLogoUrl.indexOf(splitStr);
          let path = '';
          if (idx !== -1) {
            path = oldLogoUrl.substring(idx + splitStr.length);
            await supabase.storage.from('storeadmin').remove([path]);
          }
        }
        const fileExt = selectedLogo.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('storeadmin').upload(fileName, selectedLogo, { upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('storeadmin').getPublicUrl(fileName);
        newLogoUrl = data.publicUrl;
      }
      // Save settings with new logoUrl
      const { error } = await supabase.from("branding").insert([{ data: { ...settings, logoUrl: newLogoUrl } }]);
      if (error) throw error;
      setSuccess(true);
      setSelectedLogo(null);
      setLogoPreview(newLogoUrl || "");
      prevLogoUrl.current = newLogoUrl;
      setSettings((s) => s ? { ...s, logoUrl: newLogoUrl } : s);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-600 mb-3"></div>
        <span className="text-green-700 font-medium text-lg">
          Loading settings...
        </span>
      </div>
    );
  }

  if (isLoggedIn === false) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please log in to view settings.
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
  <div className="p-4 w-full space-y-6 bg-white dark:bg-zinc-900">
      <h2 className="text-2xl font-bold">App Settings</h2>

  <Card className="p-0 w-full border-none shadow-none bg-white dark:bg-zinc-900">
        <Accordion type="multiple" className="w-full space-y-2">
          {/* Logo */}
          <AccordionItem value="logo" className="border rounded-lg bg-white dark:bg-zinc-900">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Logo
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2 bg-white dark:bg-zinc-900">
              <div className="flex flex-col gap-2">
                {logoPreview && (
                  <img src={logoPreview} alt="Logo Preview" className="h-20 w-20 object-contain border rounded-md mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedLogo(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="block"
                  disabled={saving}
                />
                {selectedLogo && (
                  <span className="text-xs text-gray-700">{selectedLogo.name}</span>
                )}
                {!selectedLogo && settings?.logoUrl && (
                  <Input
                    name="logoUrl"
                    value={settings.logoUrl}
                    onChange={handleChange}
                    placeholder="Logo URL"
                    disabled
                  />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Branding */}
          <AccordionItem value="branding" className="border rounded-lg bg-white dark:bg-zinc-900">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Branding
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-3 bg-white dark:bg-zinc-900">
              {["siteTitle", "welcomeText", "tagline"].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1 capitalize">
                    {field}
                  </label>
                  <Input
                    name={field}
                    value={(settings?.branding as any)?.[field] || ""}
                    onChange={handleChange}
                    placeholder={field}
                    data-section="branding"
                  />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Menu */}
          <AccordionItem value="menu" className="border rounded-lg bg-white dark:bg-zinc-900">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Menu
            </AccordionTrigger>
            <AccordionContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-zinc-900">
              {(["home", "products", "about"] as const).map((key) => (
                <Input
                  key={key}
                  name={key}
                  value={settings?.branding?.menu?.[key] || ""}
                  onChange={handleChange}
                  placeholder={key}
                  data-section="menu"
                />
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Nav */}
          <AccordionItem value="nav" className="border rounded-lg bg-white dark:bg-zinc-900">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Nav (Contact & FAQ)
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4 bg-white dark:bg-zinc-900">
              {["contact", "faq"].map((navType) => (
                <div key={navType}>
                  <h4 className="text-sm font-semibold mb-2">{navType.toUpperCase()}</h4>
                  {((settings?.branding?.nav as Record<"contact" | "faq", any[]>)[navType as "contact" | "faq"] || []).map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      {["title", "href", "description"].map((field) => (
                        <Input
                          key={field}
                          value={item[field] || ""}
                          onChange={handleChange}
                          placeholder={field}
                          data-section="nav"
                          data-navtype={navType}
                          data-idx={idx}
                          data-field={field}
                        />
                      ))}
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSettings((prev) => ({
                        ...prev!,
                        branding: {
                          ...prev!.branding,
                          nav: {
                            ...prev!.branding?.nav,
                            [navType]: [
                              ...((prev!.branding?.nav as Record<"contact" | "faq", any[]>)[navType as "contact" | "faq"] || []),
                              { title: "", href: "", description: "" },
                            ],
                          },
                        },
                      }));
                    }}
                  >
                    + Add {navType.charAt(0).toUpperCase() + navType.slice(1)}
                  </Button>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Slides */}
          <AccordionItem value="slides" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Slides
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {(settings?.branding?.slides || []).map((slide, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2"
                >
                  {["image", "headerText", "contentText"].map((field) => (
                    <Input
                      key={field}
                      value={(slide as any)[field] || ""}
                      onChange={handleChange}
                      placeholder={field}
                      data-section="slides"
                      data-idx={idx}
                      data-field={field}
                    />
                  ))}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSettings((prev) => ({
                    ...prev!,
                    branding: {
                      ...prev!.branding,
                      slides: [
                        ...(prev!.branding?.slides || []),
                        { image: "", headerText: "", contentText: "" },
                      ],
                    },
                  }));
                }}
              >
                + Add Slide
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Features */}
          <AccordionItem value="features" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Features
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {(settings?.branding?.features || []).map((feature, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2"
                >
                  {["title", "description", "icon"].map((field) => (
                    <Input
                      key={field}
                      value={(feature as any)[field] || ""}
                      onChange={handleChange}
                      placeholder={field}
                      data-section="features"
                      data-idx={idx}
                      data-field={field}
                    />
                  ))}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSettings((prev) => ({
                    ...prev!,
                    branding: {
                      ...prev!.branding,
                      features: [
                        ...(prev!.branding?.features || []),
                        { title: "", description: "", icon: "" },
                      ],
                    },
                  }));
                }}
              >
                + Add Feature
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Home Carousels */}
          <AccordionItem value="homeCarousels" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-2 font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-t-lg">
              Home Carousels
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-2">
              {(settings?.branding?.homeCarousels || []).map((carousel, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2"
                >
                  {["heading", "label"].map((field) => (
                    <Input
                      key={field}
                      value={(carousel as any)[field] || ""}
                      onChange={handleChange}
                      placeholder={field}
                      data-section="homeCarousels"
                      data-idx={idx}
                      data-field={field}
                    />
                  ))}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSettings((prev) => ({
                    ...prev!,
                    branding: {
                      ...prev!.branding,
                      homeCarousels: [
                        ...(prev!.branding?.homeCarousels || []),
                        { heading: "", label: "" },
                      ],
                    },
                  }));
                }}
              >
                + Add Carousel
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving || !settings}
        className="w-full bg-green-600 hover:bg-green-700 text-white border-green-700"
        variant="default"
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {success && <div className="text-green-600 text-sm">Settings saved!</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
