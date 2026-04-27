package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// OrderService handles order business logic
type OrderService struct {
	db Database
}

// Database is the data access interface
type Database interface {
	Query(query string, args ...interface{}) ([]interface{}, error)
	Execute(query string, args ...interface{}) error
}

// GetOrders handles GET /orders
func GetOrders(w http.ResponseWriter, r *http.Request) {
	orders := []map[string]string{}
	json.NewEncoder(w).Encode(orders)
}

// CreateOrder handles POST /orders
func CreateOrder(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, `{"id":"new"}`)
}

func (s *OrderService) ProcessOrder(id string) error {
	return s.db.Execute("INSERT INTO orders VALUES (?)", id)
}
