# VISTA Bridge TODO List

This document outlines the remaining tasks to complete the VISTA Bridge project.

## Medium Priority

- [ ] **Enhance Configuration:**
    - [ ] Consider using a more advanced configuration library (e.g., `convict`).
    - [ ] Allow for dynamic reloading of the configuration.

- [ ] **Improve Error Handling:**
    - [ ] Implement a more robust retry mechanism with exponential backoff for network-related errors.
    - [ ] Add a "dead-letter queue" for transactions that fail repeatedly.

- [ ] **Add Comprehensive Testing:**
    - [ ] Write unit tests for each service (Indexer, Relayer, Mirror).
    - [ ] Write integration tests to verify the end-to-end flow of the bridge.
    - [ ] Use a testing framework like Jest or Mocha.
    - [ ] Mock the UTXORPC and Cardano network interactions for testing purposes.

## Low Priority

- [ ] **Improve Documentation:**
    - [ ] Create a more detailed architectural diagram.
    - [ ] Write a guide on how to extend the bridge with new features.

- [ ] **Enhance Security:**
    - [ ] Add monitoring and alerting for suspicious activity.
    - [ ] Conduct a security audit of the codebase.

## 🎯 **Next Steps (Future Implementation)**

### Immediate (Ready for Implementation)
1. **Secure Wallet Integration**: Implement proper private key management for transaction signing
2. **Advanced Retry Logic**: Implement exponential backoff and dead-letter queues
3. **Comprehensive Testing**: Unit and integration test suite
4. **Enhanced Monitoring**: Metrics collection and alerting
5. **Production Deployment**: Complete Effect-TS context management

### Future Enhancements
1. **Key Management**: Secure wallet and private key handling
2. **Load Balancing**: gRPC service distribution and scaling
3. **Advanced Configuration**: Dynamic reloading and validation
4. **Security Audit**: Comprehensive security review and hardening
