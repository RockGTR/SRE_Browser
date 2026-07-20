import { FilterBar, SearchField, SelectField } from '../../components/Filters';
import { FILING_ROLES, type FilingFilterValues } from './filingFilters';
import type { FilingFilterKey } from './useFilingFilters';

export function FilingFilterBar({
  values,
  stateOptions,
  onSet,
  onReset,
}: {
  values: FilingFilterValues;
  stateOptions: string[];
  onSet: (key: FilingFilterKey, value: string) => void;
  onReset: () => void;
}) {
  return (
    <FilterBar onReset={onReset}>
      <SearchField
        label="Employer"
        value={values.employerSearch}
        onChange={(value) => onSet('employer', value)}
        placeholder="Search legal employer"
      />
      <SearchField
        label="Job title"
        value={values.titleSearch}
        onChange={(value) => onSet('title', value)}
        placeholder="Search filing title"
      />
      <SelectField
        label="Role category"
        value={values.role}
        onChange={(value) => onSet('role', value)}
        options={[
          { label: 'All roles', value: '' },
          ...FILING_ROLES.map((value) => ({ label: value, value })),
        ]}
      />
      <SearchField
        label="Worksite city"
        value={values.citySearch}
        onChange={(value) => onSet('city', value)}
        placeholder="Search city"
      />
      <SelectField
        label="Worksite state"
        value={values.state}
        onChange={(value) => onSet('state', value)}
        options={[
          { label: 'All states', value: '' },
          ...stateOptions.map((value) => ({ label: value, value })),
        ]}
      />
      <SelectField
        label="Minimum matching filings"
        value={values.minimumCompanyFilings ? String(values.minimumCompanyFilings) : ''}
        onChange={(value) => onSet('minFilings', value)}
        options={[
          { label: 'Any filing count', value: '' },
          { label: '2 or more', value: '2' },
          { label: '5 or more', value: '5' },
          { label: '10 or more', value: '10' },
          { label: '25 or more', value: '25' },
        ]}
      />
    </FilterBar>
  );
}
