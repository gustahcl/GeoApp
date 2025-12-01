import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  FlatList, Alert, KeyboardAvoidingView, Platform, 
  ActivityIndicator, StatusBar, Image,
  ScrollView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.1.9:3000/api';

interface Equipment {
  _id: string;
  title: string;
  description: string;
  location: string;
  laboratory: string;
  photo?: string;
  datetime: string;
  status: 'pendente' | 'em_manutencao' | 'concluido';
  createdAt: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendente': return '#f59e0b'; // Amarelo
    case 'em_manutencao': return '#3b82f6'; // Azul
    case 'concluido': return '#10b981'; // Verde
    default: return '#6b7280';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'em_manutencao': return 'Em Manutenção';
    case 'concluido': return 'Concluído';
    default: return status;
  }
};

export default function App() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [laboratory, setLaboratory] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [datetime, setDatetime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const laboratories = [
    'Laboratório de Informática 1', 'Laboratório de Informática 2', 
    'Laboratório de Eletrônica', 'Laboratório de Mecânica',
    'Laboratório de Química', 'Laboratório de Física',
    'Laboratório de Biologia'
  ];

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/equipments`);
      if (!response.ok) throw new Error("Falha ao buscar");
      const data = await response.json();
      setEquipments(data);
    } catch (error) {
      Alert.alert("Erro de Conexão", "Não foi possível carregar os equipamentos. Verifique a API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (id: string, newStatus: Equipment['status']) => {
    try {
      const response = await fetch(`${API_URL}/equipments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Falha na atualização do status");
      
      setEquipments(prevEquipments => 
        prevEquipments.map(item => 
          item._id === id ? { ...item, status: newStatus } : item
        )
      );
      Alert.alert("Sucesso", `Status alterado para ${getStatusText(newStatus)}!`);

    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar status");
    }
  };

  const handleDelete = (id: string, equipmentTitle: string) => {
    Alert.alert(
      "Excluir Reporte", 
      `Deseja excluir o reporte "${equipmentTitle}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/equipments/${id}`, { method: 'DELETE' });
              if (!response.ok) throw new Error("Falha na exclusão");
              
              setEquipments(prevEquipments => 
                prevEquipments.filter(item => item._id !== id)
              );
              Alert.alert("Sucesso", "Reporte excluído!");

            } catch (error) {
              Alert.alert("Erro", "Falha ao excluir reporte");
            }
          } 
        }
      ]
    );
  };

  const pickImage = async (useCamera: boolean) => {
    let result;
    const permissionFunc = useCamera 
      ? ImagePicker.requestCameraPermissionsAsync 
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    
    const { granted } = await permissionFunc();
    if (!granted) {
      Alert.alert("Permissão necessária", "Você precisa conceder permissão para acessar a câmera ou galeria.");
      return;
    }
    
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
    }

    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !location || !laboratory) {
        Alert.alert("Atenção", "Preencha todos os campos obrigatórios (*).");
        return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    formData.append('laboratory', laboratory);
    formData.append('datetime', datetime.toISOString());

    if (photo) {
      const uriParts = photo.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      formData.append('photo', {
        uri: photo.uri,
        name: `equipment_photo_${Date.now()}.${fileType}`,
        type: photo.mimeType || `image/${fileType}`,
      } as any);
    }

    try {
        const response = await fetch(`${API_URL}/equipments`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Falha ao enviar o reporte');

        Alert.alert("Sucesso", "Equipamento reportado com sucesso!");
        
        setTitle(''); setDescription(''); setLocation(''); setLaboratory(''); setPhoto(null);
        setDatetime(new Date());
        setModalVisible(false);

        fetchEquipments();

    } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível reportar o equipamento. Verifique o console.");
    } finally {
        setLoading(false);
    }
  };
  
  useEffect(() => { 
    fetchEquipments(); 
  }, []);

  const renderItem = ({ item }: { item: Equipment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{item.description}</Text>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="business" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{item.laboratory}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.detailText}>
            {new Date(item.datetime).toLocaleString('pt-BR')}
          </Text>
        </View>
      </View>

      {item.photo && (
        <Image 
          source={{ uri: `${API_URL.replace('/api', '')}/uploads/${item.photo}` }} 
          style={styles.equipmentImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.cardActions}>
        <View style={styles.statusActions}>
          <TouchableOpacity 
            onPress={() => updateStatus(item._id, 'pendente')}
            style={[styles.statusButton, item.status === 'pendente' && styles.statusButtonActive]}
          >
            <Text style={[styles.statusButtonText, item.status === 'pendente' && { color: '#fff' }]}>Pendente</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => updateStatus(item._id, 'em_manutencao')}
            style={[styles.statusButton, item.status === 'em_manutencao' && styles.statusButtonActive]}
          >
            <Text style={[styles.statusButtonText, item.status === 'em_manutencao' && { color: '#fff' }]}>Manutenção</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => updateStatus(item._id, 'concluido')}
            style={[styles.statusButton, item.status === 'concluido' && styles.statusButtonActive]}
          >
            <Text style={[styles.statusButtonText, item.status === 'concluido' && { color: '#fff' }]}>Concluído</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={() => handleDelete(item._id, item.title)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      <View style={styles.header}>
        <Ionicons name="warning" size={28} color="#fff" />
        <Text style={styles.headerTitle}>Reporte de Equipamentos</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && equipments.length === 0 ? (  
        <View style={styles.loadingContainer}>  
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Carregando equipamentos...</Text>
        </View> 
      ) : (  
        <FlatList  
          data={equipments}  
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchEquipments(); }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Nenhum equipamento reportado</Text>
              <Text style={styles.emptySubtitle}>
                Toque no botão "+" para reportar o primeiro equipamento com defeito
              </Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Novo Equipamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Título do Reporte *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Projetor sem ligar"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Descrição do Problema *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalhes sobre o defeito/problema"
                multiline
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Local Específico *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Mesa 5, Armário lateral"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>Laboratório *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {laboratories.map((lab) => (
                  <TouchableOpacity
                    key={lab}
                    style={[styles.labButton, laboratory === lab && styles.labButtonActive]}
                    onPress={() => setLaboratory(lab)}
                  >
                    <Text style={[styles.labButtonText, laboratory === lab && styles.labButtonTextActive]}>
                      {lab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={styles.label}>Data e Hora do Reporte (Opcional)</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                <Text style={styles.dateButtonText}>
                  {datetime.toLocaleString('pt-BR')}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={datetime}
                  mode="datetime"
                  is24Hour={true}
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDatetime(selectedDate);
                  }}
                />
              )}
              <Text style={styles.label}>Foto do Equipamento (Opcional)</Text>
              <View style={styles.photoContainer}>
                {photo ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removePhotoButton}
                      onPress={() => setPhoto(null)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(false)}>
                      <Ionicons name="images-outline" size={24} color="#6366f1" />
                      <Text style={styles.photoButtonText}>Galeria</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(true)}>
                      <Ionicons name="camera-outline" size={24} color="#6366f1" />
                      <Text style={styles.photoButtonText}>Câmera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Reportar Equipamento</Text>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  equipmentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusActions: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  statusButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    marginRight: 4,
    flex: 1,
  },
  statusButtonActive: {
    backgroundColor: '#6366f1',
  },
  statusButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  labContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  labButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  labButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  labButtonTextActive: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  photoButton: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    flex: 1,
    marginHorizontal: 4,
  },
  photoButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 10,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: 80,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});