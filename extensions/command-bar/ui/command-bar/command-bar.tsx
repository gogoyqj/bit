import React, { useCallback, useEffect, useState, useMemo } from 'react';
import classNames from 'classnames';
import { Card, CardProps } from '@teambit/base-ui.surfaces.card';
import { AutoCompleteInput } from '@teambit/command-bar.autocomplete-input';
import { CommandBarUI } from '@teambit/command-bar/command-bar.ui.runtime';
import { CommandItem } from '@teambit/command-bar.command-item';
import { CommandObj } from '@teambit/commands';
import styles from './command-bar.module.scss';

export interface ChildProps {
  execute: () => void;
  active: boolean;
}

export type CommandBarProps = {
  search: (term: string, limit?: number) => CommandObj[];
  commander: CommandBarUI;
} & CardProps;

const MIN_IDX = 0;

export function CommandBar({ search, commander, elevation = 'high', className, ...rest }: CommandBarProps) {
  const [term, setTerm] = useState('');
  const options = useMemo(() => search(term), [term, search]);
  const [activeIdx, setActive] = useState(MIN_IDX);
  const increment = useCallback(() => setActive((x) => Math.min(x + 1, options.length - 1)), [options.length]);
  const decrement = useCallback(() => setActive((x) => Math.max(x - 1, MIN_IDX)), []);
  const [visible, setVisibility] = useState(false);

  commander.setVisibility = setVisibility;

  const handleEnter = useCallback(() => {
    setVisibility(false);
    options[activeIdx]?.handler();
  }, [options, activeIdx]);

  useEffect(() => setTerm(''), [visible]);
  useEffect(() => setActive(MIN_IDX), [options]);

  return (
    <Card
      {...rest}
      elevation={elevation}
      className={classNames(className, styles.commandBar, visible && styles.visible)}
    >
      <AutoCompleteInput
        value={term}
        focus={visible}
        className={styles.input}
        onChange={(e) => setTerm(e.target.value)}
        onDown={increment}
        onUp={decrement}
        onEnter={handleEnter}
        onEscape={() => setVisibility(false)}
        onBlur={() => setVisibility(false)}
      />
      {options.map((x, idx) => (
        <CommandItem
          key={x.id}
          entry={x}
          active={idx === activeIdx}
          // mouseDown happens before blur, which closes the command bar
          onMouseDown={x.handler}
        />
      ))}
    </Card>
  );
}
