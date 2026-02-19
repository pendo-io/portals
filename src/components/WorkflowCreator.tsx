import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Save } from "lucide-react";
import { Workflow, WorkflowParameter, ROLES } from "@/types/workflow";
import { categories } from "@/data/workflows";
import * as Icons from "lucide-react";

interface WorkflowCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workflow: Workflow) => void;
}

const iconNames = Object.keys(Icons).filter(name => 
  name !== 'createLucideIcon' && 
  name !== 'Icon' && 
  typeof Icons[name as keyof typeof Icons] === 'function'
);

const WorkflowCreator = ({ isOpen, onClose, onSave }: WorkflowCreatorProps) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    longDescription: "",
    webhook: "",
    stage: "",
    iconName: "Workflow"
  });
  
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [parameters, setParameters] = useState<WorkflowParameter[]>([]);
  const [samplePayload, setSamplePayload] = useState<Record<string, any>>({});

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const addParameter = () => {
    setParameters(prev => [...prev, {
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: ""
    }]);
  };

  const updateParameter = (index: number, field: keyof WorkflowParameter, value: any) => {
    setParameters(prev => prev.map((param, i) => 
      i === index ? { ...param, [field]: value } : param
    ));
  };

  const removeParameter = (index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  };

  const handleSamplePayloadChange = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      setSamplePayload(parsed);
    } catch {
      // Keep previous value if invalid JSON
    }
  };

  const handleSave = () => {
    if (!formData.title || !formData.category || !formData.description || !formData.webhook) {
      return;
    }

    const IconComponent = Icons[formData.iconName as keyof typeof Icons] as any;
    
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      title: formData.title,
      category: formData.category,
      description: formData.description,
      longDescription: formData.longDescription || formData.description,
      roles: selectedRoles as any[],
      webhook: formData.webhook,
      samplePayload,
      parameters,
      icon: IconComponent || Icons.Workflow,
      stage: formData.stage
    };

    onSave(newWorkflow);
    
    // Reset form
    setFormData({
      title: "",
      category: "",
      description: "",
      longDescription: "",
      webhook: "",
      stage: "",
      iconName: "Workflow"
    });
    setSelectedRoles([]);
    setParameters([]);
    setSamplePayload({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Workflow title"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the workflow"
            />
          </div>

          <div>
            <Label htmlFor="longDescription">Long Description</Label>
            <Textarea
              id="longDescription"
              value={formData.longDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, longDescription: e.target.value }))}
              placeholder="Detailed description for the info drawer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhook">Webhook URL *</Label>
              <Input
                id="webhook"
                value={formData.webhook}
                onChange={(e) => setFormData(prev => ({ ...prev, webhook: e.target.value }))}
                placeholder="/webhook/your-endpoint"
              />
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Input
                id="stage"
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                placeholder="e.g. Planning, Research"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="icon">Icon</Label>
            <Select value={formData.iconName} onValueChange={(value) => setFormData(prev => ({ ...prev, iconName: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent className="max-h-40">
                {iconNames.slice(0, 50).map(iconName => (
                  <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Roles */}
          <div>
            <Label>Roles *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ROLES.map(role => (
                <Badge
                  key={role}
                  variant={selectedRoles.includes(role) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleRoleToggle(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Form Parameters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>
            
            {parameters.map((param, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Parameter {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameter(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={param.name}
                      onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      placeholder="parameterName"
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={param.label}
                      onChange={(e) => updateParameter(index, 'label', e.target.value)}
                      placeholder="Display Label"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={param.type} onValueChange={(value) => updateParameter(index, 'type', value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Placeholder</Label>
                    <Input
                      value={param.placeholder || ""}
                      onChange={(e) => updateParameter(index, 'placeholder', e.target.value)}
                      placeholder="Placeholder text"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                    />
                    <Label>Required</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Payload */}
          <div>
            <Label htmlFor="samplePayload">Sample Payload (JSON)</Label>
            <Textarea
              id="samplePayload"
              value={JSON.stringify(samplePayload, null, 2)}
              onChange={(e) => handleSamplePayloadChange(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowCreator;
