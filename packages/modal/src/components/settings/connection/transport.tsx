import type { TurnServer } from "@openlv/provider/storage";
import { LuPlus, LuTrash2 } from "react-icons/lu";

import { useSettings } from "../../../hooks/useSettings.js";
import { Button } from "../../../ui/Button.js";
import { Input } from "../../../ui/Input.js";
import { MenuGroup } from "../../../ui/menu/MenuGroup.js";
import { useTranslation } from "../../../utils/i18n.js";

const ServerListItem = ({
  children,
  onRemove,
}: {
  children: preact.ComponentChildren;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-2">
    <div className="flex-1">{children}</div>
    <Button onClick={onRemove} $variant="tertiary" $aspect="square" $size="sm">
      <LuTrash2 className="h-4 w-4 text-(--lv-text-muted)" />
    </Button>
  </div>
);

const AddServerButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-(--lv-control-input-border) py-2 text-sm text-(--lv-text-muted) hover:bg-(--lv-card-background)"
  >
    <LuPlus className="h-4 w-4" />
    {label}
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

  const stunServers = settings?.transport?.s?.webrtc?.stun ?? [];
  const turnServers = settings?.transport?.s?.webrtc?.turn ?? [];

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
        <div className="flex flex-col gap-2 p-2">
          {stunServers.map((server, index) => (
            <ServerListItem
              key={index}
              onRemove={() => handleRemoveStun(index)}
            >
              <Input
                value={server}
                onChange={value => handleStunChange(index, value)}
                placeholder="stun:stun.l.google.com:19302"
                readOnly={false}
              />
            </ServerListItem>
          ))}
          <AddServerButton
            label={t("settings.transport.iceServers.addStun")}
            onClick={handleAddStun}
          />
        </div>
      </MenuGroup>

      <MenuGroup title={t("settings.transport.iceServers.turn")}>
        <div className="flex flex-col gap-3 p-2">
          {turnServers.map((server, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-(--lv-control-input-border) p-2"
            >
              <ServerListItem onRemove={() => handleRemoveTurn(index)}>
                <Input
                  value={server.urls}
                  onChange={value => handleTurnChange(index, "urls", value)}
                  placeholder="turn:relay.example.com:443"
                  readOnly={false}
                />
              </ServerListItem>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={server.username ?? ""}
                  onChange={value =>
                    handleTurnChange(index, "username", value)}
                  placeholder="Username"
                  readOnly={false}
                />
                <Input
                  value={server.credential ?? ""}
                  onChange={value =>
                    handleTurnChange(index, "credential", value)}
                  placeholder="Password"
                  readOnly={false}
                />
              </div>
            </div>
          ))}
          <AddServerButton
            label={t("settings.transport.iceServers.addTurn")}
            onClick={handleAddTurn}
          />
        </div>
      </MenuGroup>
      <div className="p-2 text-sm text-(--lv-text-secondary) text-start">
        {t("settings.transport.description")}
      </div>
    </>
  );
};
