import { createMemo, For } from "solid-js";
import type { TurnServer } from "@openlv/provider/storage";
import type { JSX } from "solid-js";

import { useSettings } from "../../../hooks/useSettings.js";
import { Button } from "../../../ui/Button.js";
import { IconPlus, IconTrash2 } from "../../../ui/icons.js";
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
      <IconTrash2 class="h-4 w-4 text-(--lv-text-muted)" />
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
    <IconPlus class="h-4 w-4" />
    {props.label}
  </button>
);

export const TransportSettings = () => {
  const { t } = useTranslation();
  const {
    settings,
    addStunServer,
    removeStunServer,
    updateStunServer,
    addTurnServer,
    removeTurnServer,
    updateTurnServer,
  } = useSettings();

  const stunServers = createMemo(
    () => settings()?.transport?.s?.webrtc?.stun ?? [],
  );
  const turnServers = createMemo(
    () => settings()?.transport?.s?.webrtc?.turn ?? [],
  );

  const handleStunChange = (index: number, value: string) => {
    updateStunServer(index, value);
  };

  const handleAddStun = () => {
    addStunServer("");
  };

  const handleRemoveStun = (index: number) => {
    removeStunServer(index);
  };

  const handleTurnChange = (
    index: number,
    field: keyof TurnServer,
    value: string,
  ) => {
    updateTurnServer(index, { [field]: value || undefined });
  };

  const handleAddTurn = () => {
    addTurnServer({ urls: "" });
  };

  const handleRemoveTurn = (index: number) => {
    removeTurnServer(index);
  };

  return (
    <>
      <MenuGroup title={t("settings.transport.iceServers.stun")}>
        <div class="flex flex-col gap-2 p-2">
          <For each={stunServers()}>
            {(server, index) => (
              <ServerListItem onRemove={() => handleRemoveStun(index())}>
                <Input
                  value={server}
                  onChange={(value) => handleStunChange(index(), value)}
                  placeholder="stun:stun.l.google.com:19302"
                  readOnly={false}
                />
              </ServerListItem>
            )}
          </For>
          <AddServerButton
            label={t("settings.transport.iceServers.addStun")}
            onClick={handleAddStun}
          />
        </div>
      </MenuGroup>

      <MenuGroup title={t("settings.transport.iceServers.turn")}>
        <div class="flex flex-col gap-3 p-2">
          <For each={turnServers()}>
            {(server, index) => (
              <div class="flex flex-col gap-2 rounded-md border border-(--lv-control-input-border) p-2">
                <ServerListItem onRemove={() => handleRemoveTurn(index())}>
                  <Input
                    value={server.urls}
                    onChange={(value) =>
                      handleTurnChange(index(), "urls", value)
                    }
                    placeholder="turn:relay.example.com:443"
                    readOnly={false}
                  />
                </ServerListItem>
                <div class="grid grid-cols-2 gap-2">
                  <Input
                    value={server.username ?? ""}
                    onChange={(value) =>
                      handleTurnChange(index(), "username", value)
                    }
                    placeholder="Username"
                    readOnly={false}
                  />
                  <Input
                    value={server.credential ?? ""}
                    onChange={(value) =>
                      handleTurnChange(index(), "credential", value)
                    }
                    placeholder="Password"
                    readOnly={false}
                  />
                </div>
              </div>
            )}
          </For>
          <AddServerButton
            label={t("settings.transport.iceServers.addTurn")}
            onClick={handleAddTurn}
          />
        </div>
      </MenuGroup>
      <div class="p-2 text-sm text-(--lv-text-secondary) text-start">
        {t("settings.transport.description")}
      </div>
    </>
  );
};
