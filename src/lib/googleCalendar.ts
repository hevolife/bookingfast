import { supabase } from './supabase';
import { Booking } from '../types';

interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarService {
  private static async getAccessToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('access_token, token_expiry, refresh_token')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.error('❌ Token non trouvé:', error);
        return null;
      }

      // Vérifier si le token est expiré
      if (new Date(data.token_expiry) < new Date()) {
        console.log('🔄 Token expiré, rafraîchissement...');
        return await this.refreshAccessToken(userId, data.refresh_token);
      }

      return data.access_token;
    } catch (error) {
      console.error('❌ Erreur récupération token:', error);
      return null;
    }
  }

  private static async refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('❌ Configuration Google manquante');
        return null;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur rafraîchissement token');
      }

      const data = await response.json();
      const newExpiry = new Date(Date.now() + data.expires_in * 1000);

      // Mettre à jour le token dans la base
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: data.access_token,
          token_expiry: newExpiry.toISOString(),
        })
        .eq('user_id', userId);

      return data.access_token;
    } catch (error) {
      console.error('❌ Erreur rafraîchissement token:', error);
      return null;
    }
  }

  private static async getCalendarId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('google_calendar_id, google_calendar_enabled')
        .eq('user_id', userId)
        .single();

      if (error || !data || !data.google_calendar_enabled) {
        return null;
      }

      return data.google_calendar_id;
    } catch (error) {
      console.error('❌ Erreur récupération calendar ID:', error);
      return null;
    }
  }

  static async createEvent(booking: Booking, userId: string): Promise<string | null> {
    try {
      console.log('📅 Création événement Google Calendar pour:', booking.id);

      const accessToken = await this.getAccessToken(userId);
      const calendarId = await this.getCalendarId(userId);

      if (!accessToken || !calendarId) {
        console.warn('⚠️ Google Calendar non configuré ou token invalide');
        return null;
      }

      // Construire l'événement
      const startDateTime = new Date(`${booking.date}T${booking.time}`);
      const endDateTime = new Date(startDateTime.getTime() + booking.duration_minutes * 60000);

      const serviceName = booking.custom_service_data?.name || booking.service?.name || 'Réservation';
      const clientName = `${booking.client_firstname} ${booking.client_name}`;

      const event: GoogleCalendarEvent = {
        summary: `${serviceName} - ${clientName}`,
        description: `
📋 Réservation BookingFast

👤 Client: ${clientName}
📧 Email: ${booking.client_email}
📞 Téléphone: ${booking.client_phone}
🎯 Service: ${serviceName}
👥 Quantité: ${booking.quantity}
💰 Montant: ${booking.total_amount.toFixed(2)}€
${booking.notes ? `\n📝 Notes: ${booking.notes}` : ''}

Statut: ${booking.booking_status === 'confirmed' ? '✅ Confirmée' : booking.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
Paiement: ${booking.payment_status === 'completed' ? '✅ Payé' : booking.payment_status === 'partial' ? '💵 Partiel' : '❌ Non payé'}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Europe/Paris',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Europe/Paris',
        },
        attendees: [
          {
            email: booking.client_email,
            displayName: clientName,
          },
        ],
      };

      // Créer l'événement via l'API Google Calendar
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur API Google Calendar: ${errorData.error?.message || 'Erreur inconnue'}`);
      }

      const createdEvent = await response.json();
      console.log('✅ Événement créé:', createdEvent.id);

      // Mettre à jour la réservation avec l'ID de l'événement
      await supabase
        .from('bookings')
        .update({ google_calendar_event_id: createdEvent.id })
        .eq('id', booking.id);

      return createdEvent.id;
    } catch (error) {
      console.error('❌ Erreur création événement Google Calendar:', error);
      return null;
    }
  }

  static async updateEvent(booking: Booking, userId: string): Promise<boolean> {
    try {
      console.log('📅 Mise à jour événement Google Calendar pour:', booking.id);

      if (!booking.google_calendar_event_id) {
        console.log('ℹ️ Pas d\'événement Google Calendar, création...');
        await this.createEvent(booking, userId);
        return true;
      }

      const accessToken = await this.getAccessToken(userId);
      const calendarId = await this.getCalendarId(userId);

      if (!accessToken || !calendarId) {
        console.warn('⚠️ Google Calendar non configuré ou token invalide');
        return false;
      }

      // Construire l'événement mis à jour
      const startDateTime = new Date(`${booking.date}T${booking.time}`);
      const endDateTime = new Date(startDateTime.getTime() + booking.duration_minutes * 60000);

      const serviceName = booking.custom_service_data?.name || booking.service?.name || 'Réservation';
      const clientName = `${booking.client_firstname} ${booking.client_name}`;

      const event: GoogleCalendarEvent = {
        summary: `${serviceName} - ${clientName}`,
        description: `
📋 Réservation BookingFast

👤 Client: ${clientName}
📧 Email: ${booking.client_email}
📞 Téléphone: ${booking.client_phone}
🎯 Service: ${serviceName}
👥 Quantité: ${booking.quantity}
💰 Montant: ${booking.total_amount.toFixed(2)}€
${booking.notes ? `\n📝 Notes: ${booking.notes}` : ''}

Statut: ${booking.booking_status === 'confirmed' ? '✅ Confirmée' : booking.booking_status === 'cancelled' ? '❌ Annulée' : '⏳ En attente'}
Paiement: ${booking.payment_status === 'completed' ? '✅ Payé' : booking.payment_status === 'partial' ? '💵 Partiel' : '❌ Non payé'}
        `.trim(),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Europe/Paris',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Europe/Paris',
        },
        attendees: [
          {
            email: booking.client_email,
            displayName: clientName,
          },
        ],
      };

      // Mettre à jour l'événement via l'API Google Calendar
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${booking.google_calendar_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur API Google Calendar: ${errorData.error?.message || 'Erreur inconnue'}`);
      }

      console.log('✅ Événement mis à jour');
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour événement Google Calendar:', error);
      return false;
    }
  }

  static async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      console.log('📅 Suppression événement Google Calendar:', eventId);

      const accessToken = await this.getAccessToken(userId);
      const calendarId = await this.getCalendarId(userId);

      if (!accessToken || !calendarId) {
        console.warn('⚠️ Google Calendar non configuré ou token invalide');
        return false;
      }

      // Supprimer l'événement via l'API Google Calendar
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(`Erreur API Google Calendar: ${errorData.error?.message || 'Erreur inconnue'}`);
      }

      console.log('✅ Événement supprimé');
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression événement Google Calendar:', error);
      return false;
    }
  }
}
