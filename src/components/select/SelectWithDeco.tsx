import * as React from 'react';
import styled from 'styled-components';
import { mediaWidths, themeColors } from 'src/styles/Themes';
import ScaleLoader from 'react-spinners/ScaleLoader';
import { SingleLine } from '../generic/Styled';
import { Select, ValueProp } from '.';

const NoWrapText = styled.div`
  white-space: nowrap;
  font-size: 14px;
`;

const InputTitle = styled(NoWrapText)``;

const InputTitleRow = styled.div`
  display: flex;

  @media (${mediaWidths.mobile}) {
    flex-wrap: wrap;
    margin: 8px 0;
  }
`;

const InputLine = styled(SingleLine)`
  width: 100%;
  margin: 8px 0;

  @media (${mediaWidths.mobile}) {
    flex-direction: column;
  }
`;

type InputWithDecoProps = {
  title: string;
  options: ValueProp[];
  noInput?: boolean;
  loading?: boolean;
  callback: (value: ValueProp) => void;
};

export const SelectWithDeco: React.FC<InputWithDecoProps> = ({
  children,
  title,
  noInput,
  options,
  loading,
  callback,
}) => {
  const renderContent = () => {
    switch (true) {
      case loading:
        return <ScaleLoader height={20} color={themeColors.blue3} />;
      case !noInput:
        return (
          <Select maxWidth={'500px'} options={options} callback={callback} />
        );
      default:
        return null;
    }
  };
  return (
    <InputLine>
      <InputTitleRow>
        <InputTitle>{title}</InputTitle>
      </InputTitleRow>
      {renderContent()}
      {children}
    </InputLine>
  );
};