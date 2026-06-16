import {
  type TurnServer,
} from "@openlv/provider/storage";
import { LucidePlus, LucideTrash2 } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, For } from "solid-js";

import { useSettings } from "../../../hooks/useSettings.js";
import { Button } from "../../../ui/Button.js";
import { Input } from "../../../ui/Input.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { useTranslation } from "../../../utils/i18n.js";

const ServerListItem = (props: {
  children: JSX.Element;
  onRemove: () => void;
}) => (
  <div class="flex items-center gap-2">
    <div class="flex-1">{props.children}</div>
    <Button
      onClick={props.onRemove}
      $variant="tertiary"
      $aspect="square"
      $size="sm"
    >
      <LucideTrash2 class="h-4 w-4 text-(--lv-text-muted)" />
    </Button>
  </div>
);

const AddServerButton = (props: {
  label: JSX.Element;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={props.onClick}
    class="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-(--lv-control-input-border) py-2 text-sm text-(--lv-text-muted) hover:bg-(--lv-card-background)"
  >
    <LucidePlus class="h-4 w-4" />
    {props.label}
  </button>
);

const StunSettings = (props: {
  servers: string[];
  onChange: (servers: string[]) => void;
}) => {
  const { t } = useTranslation();

  return (
    <MenuGroup title={t("settings.transport.iceServers.stun")}>
      <div class="flex flex-col gap-2 p-2">
        <For each={props.servers}>
          {(server, index) => (
            <ServerListItem
              onRemove={() => props.onChange(props.servers.filter((_, i) => i !== index()))}
            >
              <Input
                value={server}
                onChange={value => props.onChange(props.servers.map((item, i) =>
                  (i === index() ? value : item)))}
                placeholder="stun:stun.l.google.com:19302"
                readOnly={false}
              />
            </ServerListItem>
          )}
        </For>
        <AddServerButton
          label={t("settings.transport.iceServers.addStun")}
          onClick={() => props.onChange([...props.servers, ""])}
        />
      </div>
    </MenuGroup>
  );
};

const TurnSettings = (props: {
  servers: TurnServer[];
  onChange: (servers: TurnServer[]) => void;
}) => {
  const { t } = useTranslation();
  const update = (index: number, field: keyof TurnServer, value: string) =>
    props.onChange(props.servers.map((server, i) =>
      (i === index ? { ...server, [field]: value } : server)));

  return (
    <MenuGroup title={t("settings.transport.iceServers.turn")}>
      <div class="flex flex-col gap-3 p-2">
        <For each={props.servers}>
          {(server, index) => (
            <div class="flex flex-col gap-2 rounded-md border border-(--lv-control-input-border) p-2">
              <ServerListItem
                onRemove={() => props.onChange(props.servers.filter((_, i) => i !== index()))}
              >
                <Input
                  value={server.urls}
                  onChange={value => update(index(), "urls", value)}
                  placeholder="turn:relay.example.com:443"
                  readOnly={false}
                />
              </ServerListItem>
              <div class="grid grid-cols-2 gap-2">
                <Input
                  value={server.username ?? ""}
                  onChange={value => update(index(), "username", value)}
                  placeholder="Username"
                  readOnly={false}
                />
                <Input
                  value={server.credential ?? ""}
                  onChange={value => update(index(), "credential", value)}
                  placeholder="Password"
                  readOnly={false}
                />
              </div>
            </div>
          )}
        </For>
        <AddServerButton
          label={t("settings.transport.iceServers.addTurn")}
          onClick={() => props.onChange([...props.servers, { urls: "" }])}
        />
      </div>
    </MenuGroup>
  );
};

export const TransportSettings = () => {
  const { t } = useTranslation();
  const {
    settings,
    setSettings,
  } = useSettings();

  const webRTCSettings = createMemo(() => settings().transport?.s?.webrtc ?? {});
  const turnServers = createMemo(() => webRTCSettings().turn ?? []);
  const stunServers = createMemo(() => webRTCSettings().stun ?? []);

  const setWebRTCSettings = (next: { stun?: string[]; turn?: TurnServer[]; }) => {
    setSettings({
      ...settings(),
      transport: {
        ...settings().transport,
        p: "webrtc",
        s: {
          ...settings().transport?.s,
          webrtc: next,
        },
      },
    });
  };

  return (
    <>
      <StunSettings
        servers={stunServers()}
        onChange={stun => setWebRTCSettings({ ...webRTCSettings(), stun })}
      />
      <TurnSettings
        servers={turnServers()}
        onChange={turn => setWebRTCSettings({ ...webRTCSettings(), turn })}
      />
      <div class="p-2 text-sm text-(--lv-text-secondary) text-start">
        {t("settings.transport.description")}
      </div>
    </>
  );
};
