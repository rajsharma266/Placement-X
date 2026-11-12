import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Power, Save, Trash2, X } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Select, Textarea } from '../components/ui/FormFields';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StatePanel';
import {
  createAdminContent,
  deactivateAdminContent,
  getAdminContent,
  updateAdminContent,
} from '../api/adminService';

const configs = {
  dsa: {
    title: 'DSA Questions', resource: 'dsa', fields: [
      ['title', 'Title'], ['slug', 'Slug'], ['description', 'Description', 'textarea'],
      ['topic', 'Topic'], ['difficulty', 'Difficulty', 'select', ['easy', 'medium', 'hard']],
      ['tags', 'Tags (comma separated)'], ['companyTags', 'Company tags (comma separated)'],
      ['hints', 'Hints (comma separated)'], ['solution', 'Solution', 'textarea'],
      ['externalPracticeUrl', 'External practice URL'],
    ],
  },
  aptitude: {
    title: 'Aptitude Questions', resource: 'aptitude', fields: [
      ['question', 'Question', 'textarea'], ['options', 'Options (one per line)', 'textarea'],
      ['correctAnswer', 'Correct option', 'selectIndex'], ['explanation', 'Explanation', 'textarea'],
      ['category', 'Category', 'select', ['quantitative', 'logical-reasoning', 'verbal-ability']],
      ['topic', 'Topic'], ['difficulty', 'Difficulty', 'select', ['easy', 'medium', 'hard']],
      ['companyTags', 'Company tags (comma separated)'],
    ],
  },
  companies: {
    title: 'Companies', resource: 'companies', fields: [
      ['name', 'Company name'], ['slug', 'Slug'], ['logoUrl', 'Logo URL'],
      ['description', 'Description', 'textarea'], ['roles', 'Roles (comma separated)'],
      ['requiredSkills', 'Required skills (comma separated)'], ['eligibility', 'Eligibility', 'textarea'],
      ['dsaTopics', 'DSA topics (comma separated)'], ['aptitudeTopics', 'Aptitude topics (comma separated)'],
      ['technicalTopics', 'Technical topics (comma separated)'], ['hrTopics', 'HR topics (comma separated)'],
      ['preparationTips', 'Preparation tips (comma separated)'],
    ],
  },
  'interview-questions': {
    title: 'Interview Question Bank', resource: 'interview-questions', fields: [
      ['prompt', 'Question prompt', 'textarea'], ['targetRoles', 'Target roles (comma separated)'],
      ['interviewType', 'Interview type', 'select', ['HR', 'Technical', 'Mixed']],
      ['difficulty', 'Difficulty', 'select', ['easy', 'medium', 'hard']],
      ['keywords', 'Evaluation keywords (comma separated)'],
    ],
  },
};

const arrays = new Set([
  'tags', 'companyTags', 'hints', 'options', 'roles', 'requiredSkills', 'dsaTopics',
  'aptitudeTopics', 'technicalTopics', 'hrTopics', 'preparationTips', 'targetRoles', 'keywords',
]);

const Repeatable = ({ title, items, onChange, fields }) => (
  <div className="mt-6 border-t border-slate-800 pt-5 md:col-span-2">
    <div className="flex items-center justify-between gap-4">
      <h3 className="font-semibold">{title}</h3>
      <Button
        type="button"
        variant="secondary"
        fullWidth={false}
        className="h-9"
        onClick={() => onChange([...items, Object.fromEntries(fields.map(([key]) => [key, '']))])}
      >
        <Plus size={15} className="mr-1" />Add
      </Button>
    </div>
    <div className="mt-4 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label, kind]) => (
              <div key={key} className={kind === 'textarea' ? 'sm:col-span-2' : ''}>
                {kind === 'textarea' ? (
                  <Textarea
                    label={label}
                    value={item[key] || ''}
                    onChange={(event) => onChange(items.map((entry, itemIndex) => (
                      itemIndex === index ? { ...entry, [key]: event.target.value } : entry
                    )))}
                  />
                ) : (
                  <Input
                    label={label}
                    value={item[key] || ''}
                    onChange={(event) => onChange(items.map((entry, itemIndex) => (
                      itemIndex === index ? { ...entry, [key]: event.target.value } : entry
                    )))}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm text-rose-300"
            onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Trash2 size={15} />Remove
          </button>
        </div>
      ))}
    </div>
  </div>
);

const AdminContentPage = ({ type }) => {
  const config = configs[type];
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await getAdminContent(config.resource, { page: 1, limit: 50 })).items || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load content.');
    } finally {
      setLoading(false);
    }
  }, [config.resource]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const begin = (item = {}) => setEditing({
    ...item,
    ...Object.fromEntries(
      Object.entries(item).map(([key, value]) => [
        key,
        Array.isArray(value) && !['examples', 'hiringRounds'].includes(key)
          ? value.join(type === 'aptitude' && key === 'options' ? '\n' : ', ')
          : value ?? '',
      ]),
    ),
    examples: item.examples || [],
    hiringRounds: item.hiringRounds || [],
  });

  const form = editing || {};
  const set = (key, value) => setEditing({ ...form, [key]: value });

  const payload = () => {
    const out = {};
    for (const [key] of config.fields) {
      let value = form[key];
      if (arrays.has(key)) {
        value = String(value || '')
          .split(key === 'options' ? '\n' : ',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      if (key === 'correctAnswer') value = Number(value);
      out[key] = value;
    }
    if (type === 'dsa') out.examples = form.examples;
    if (type === 'companies') out.hiringRounds = form.hiringRounds;
    return out;
  };

  const save = async (event) => {
    event.preventDefault();
    const invalidExamples = type === 'dsa' && form.examples.some((example) => (
      !example.input.trim() || !example.output.trim() || !example.explanation.trim()
    ));
    const invalidRounds = type === 'companies' && form.hiringRounds.some((round) => (
      !round.name.trim() || !round.description.trim()
    ));
    if (invalidExamples || invalidRounds) {
      toast.error('Complete or remove every structured entry before saving.');
      return;
    }

    setSaving(true);
    try {
      if (form._id) await updateAdminContent(config.resource, form._id, payload());
      else await createAdminContent(config.resource, payload());
      toast.success(form._id ? 'Content updated' : 'Content created');
      setEditing(null);
      load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to save content.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this content item?')) return;
    try {
      await deactivateAdminContent(config.resource, id);
      toast.success('Content deactivated');
      load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to deactivate content.');
    }
  };

  if (loading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState description={error} onRetry={load} />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="CONTENT MANAGEMENT"
        title={config.title}
        description="Create, update, or deactivate shared preparation content."
        action={<Button fullWidth={false} onClick={() => begin()}><Plus size={16} className="mr-2" />Add content</Button>}
      />

      {editing && (
        <Card className="p-5">
          <div className="flex justify-between gap-4">
            <h2 className="font-semibold">{form._id ? 'Edit' : 'Create'} content</h2>
            <button type="button" onClick={() => setEditing(null)} aria-label="Close form"><X /></button>
          </div>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={save}>
            {config.fields.map(([key, label, kind, options]) => (
              <div key={key} className={kind === 'textarea' ? 'md:col-span-2' : ''}>
                {kind === 'textarea' ? (
                  <Textarea label={label} value={form[key] || ''} onChange={(event) => set(key, event.target.value)} />
                ) : kind === 'select' || kind === 'selectIndex' ? (
                  <Select label={label} value={form[key] ?? ''} onChange={(event) => set(key, event.target.value)}>
                    <option value="">Select</option>
                    {(kind === 'selectIndex'
                      ? String(form.options || '').split('\n').filter(Boolean).map((value, index) => [index, value])
                      : options.map((value) => [value, value])
                    ).map(([value, text]) => (
                      <option key={value} value={value}>
                        {kind === 'selectIndex' ? `Option ${Number(value) + 1}: ${text}` : text}
                      </option>
                    ))}
                  </Select>
                ) : <Input label={label} value={form[key] || ''} onChange={(event) => set(key, event.target.value)} />}
              </div>
            ))}

            {type === 'dsa' && (
              <Repeatable
                title="Examples"
                items={form.examples}
                onChange={(value) => set('examples', value)}
                fields={[
                  ['input', 'Input', 'textarea'],
                  ['output', 'Output', 'textarea'],
                  ['explanation', 'Explanation', 'textarea'],
                ]}
              />
            )}
            {type === 'companies' && (
              <Repeatable
                title="Hiring rounds"
                items={form.hiringRounds}
                onChange={(value) => set('hiringRounds', value)}
                fields={[
                  ['name', 'Round name'],
                  ['description', 'Description', 'textarea'],
                ]}
              />
            )}
            <div className="md:col-span-2">
              <Button fullWidth={false} isLoading={saving} type="submit"><Save size={16} className="mr-2" />Save content</Button>
            </div>
          </form>
        </Card>
      )}

      {items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title || item.name || item.question || item.prompt}</p>
                <p className="mt-1 text-sm text-slate-500">{item.topic || item.category || item.interviewType || item.slug}</p>
              </div>
              <Badge tone={item.isActive ? 'good' : 'warning'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
              <Button variant="secondary" fullWidth={false} className="h-9" onClick={() => begin(item)}>Edit</Button>
              {item.isActive && (
                <Button variant="ghost" fullWidth={false} className="h-9 text-rose-300" onClick={() => deactivate(item._id)} aria-label="Deactivate content">
                  <Power size={16} />
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : <EmptyState title={`No ${config.title.toLowerCase()} yet`} description="Create the first content item for students." />}
    </div>
  );
};

export default AdminContentPage;
