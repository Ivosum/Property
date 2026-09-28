import OffMarketLayout from "@/components/off-market/OffMarketLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Mail, Phone, Building2 } from "lucide-react";

const Clients = () => {
  // Mock clients data
  const clients = [
    {
      id: "1",
      name: "Thomas Weber",
      email: "thomas@example.com",
      phone: "+41 79 123 45 67",
      type: "buyer",
      status: "active",
      properties: 0,
    },
    {
      id: "2",
      name: "Maria Huber",
      email: "maria@example.com",
      phone: "+41 79 234 56 78",
      type: "seller",
      status: "active",
      properties: 2,
    },
    {
      id: "3",
      name: "Peter Müller",
      email: "peter@example.com",
      phone: "+41 79 345 67 89",
      type: "buyer",
      status: "pending",
      properties: 0,
    },
  ];

  return (
    <OffMarketLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Kunden</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Käufer und Verkäufer
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Kunde hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gesamt</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Käufer</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verkäufer</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Kunde suchen..." className="pl-10" />
        </div>
      </div>

      {/* Clients List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {clients.map((client) => (
              <div key={client.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">{client.name[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.name}</p>
                        <Badge variant={client.type === "buyer" ? "default" : "secondary"}>
                          {client.type === "buyer" ? "Käufer" : "Verkäufer"}
                        </Badge>
                        {client.status === "pending" && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </span>
                        {client.type === "seller" && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {client.properties} Immobilien
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </OffMarketLayout>
  );
};

export default Clients;
