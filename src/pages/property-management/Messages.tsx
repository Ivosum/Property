import PropertyManagementLayout from "@/components/property-management/PropertyManagementLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Send, Inbox, Archive } from "lucide-react";

const Messages = () => {
  const messages = [
    { from: "Hans Müller", subject: "Frage zur Nebenkostenabrechnung", preview: "Guten Tag, ich habe eine Frage bezüglich...", date: "Heute, 14:30", unread: true },
    { from: "Anna Schmidt", subject: "Reparatur bestätigt", preview: "Vielen Dank für die schnelle Bearbeitung...", date: "Heute, 10:15", unread: true },
    { from: "Thomas Weber", subject: "Kündigungsbestätigung", preview: "Hiermit bestätige ich den Erhalt...", date: "Gestern", unread: false },
    { from: "Maria Keller", subject: "Schlüsselübergabe", preview: "Bezüglich der Schlüsselübergabe am...", date: "02.02.2026", unread: false },
  ];

  return (
    <PropertyManagementLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Kommunikation</h1>
          <p className="text-muted-foreground mt-1">Nachrichten und Korrespondenz</p>
        </div>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Neue Nachricht
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-2">
            <Inbox className="w-4 h-4" />
            Posteingang
            <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">2</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Send className="w-4 h-4" />
            Gesendet
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Archive className="w-4 h-4" />
            Archiv
          </Button>
        </div>

        {/* Messages List */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Posteingang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    msg.unread ? "bg-primary/5 border-l-4 border-primary" : "bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${msg.unread ? "text-foreground" : "text-muted-foreground"}`}>
                          {msg.from}
                        </p>
                        {msg.unread && <span className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                      <p className={`text-sm ${msg.unread ? "font-medium" : ""}`}>{msg.subject}</p>
                      <p className="text-sm text-muted-foreground truncate mt-1">{msg.preview}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{msg.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PropertyManagementLayout>
  );
};

export default Messages;
