package com.shopeasy.product.controller;

import com.shopeasy.product.model.Product;
import com.shopeasy.product.repository.ProductRepository;
import org.apache.commons.text.StringSubstitutor;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/products")
public class ProductController {

    // CVE-2021-44228: Log4Shell — logger.info() with user-controlled input
    private static final Logger logger = LogManager.getLogger(ProductController.class);

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // ── Health ────────────────────────────────────────────────────────────────
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> resp = new HashMap<>();
        resp.put("status", "ok");
        resp.put("service", "product-service");
        resp.put("version", "1.0.0");
        return ResponseEntity.ok(resp);
    }

    // ── List / Search ─────────────────────────────────────────────────────────
    @GetMapping
    public List<Product> listProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {

        if (search != null && !search.isEmpty()) {
            // CVE-2021-44228: User-supplied 'search' string passed to logger
            logger.info("Product search query: {}", search);
            return productRepository.findByNameContainingIgnoreCase(search);
        }
        if (category != null && !category.isEmpty()) {
            return productRepository.findByCategory(category);
        }
        return productRepository.findAll();
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Optional<Product> product = productRepository.findById(id);
        return product.map(ResponseEntity::ok)
                      .orElse(ResponseEntity.notFound().build());
    }

    // ── Create ────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product saved = productRepository.save(product);
        logger.info("Created product: id={}, name={}", saved.getId(), saved.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(@PathVariable Long id,
                                                  @RequestBody Product updated) {
        return productRepository.findById(id).map(existing -> {
            existing.setName(updated.getName());
            existing.setDescription(updated.getDescription());
            existing.setPrice(updated.getPrice());
            existing.setStock(updated.getStock());
            existing.setCategory(updated.getCategory());
            existing.setImageUrl(updated.getImageUrl());
            return ResponseEntity.ok(productRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── Template expand (commons-text — CVE-2022-42889 Text4Shell) ───────────
    @GetMapping("/render-template")
    public ResponseEntity<Map<String, String>> renderTemplate(
            @RequestParam String template) {
        // CVE-2022-42889: StringSubstitutor.replace with user input enables RCE
        String result = StringSubstitutor.replaceSystemProperties(template);
        Map<String, String> resp = new HashMap<>();
        resp.put("rendered", result);
        return ResponseEntity.ok(resp);
    }
}
