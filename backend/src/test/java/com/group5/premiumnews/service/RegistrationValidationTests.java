package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.auth.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.group5.premiumnews.repository.*;
import com.group5.premiumnews.exception.ConflictException;
import org.springframework.security.crypto.password.PasswordEncoder;

class RegistrationValidationTests {
    private RegistrationRequest request(String name,String username,String email) {
        return new RegistrationRequest(username,email,"Password123",name,"0901234567",AccountType.READER,"Password123",true);
    }
    @Test void namesUsernamesAndEmailsAreValidated() {
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var validator=factory.getValidator();
            assertTrue(validator.validate(request("Nguyễn Văn An","an@123","an+news@example.com")).isEmpty());
            assertTrue(validator.validate(request("Nguyễn Văn An","an.demo","an@example.com")).isEmpty());
            assertFalse(validator.validate(new RegistrationRequest("an.demo","an@example.com","Password123","An","0901234567",AccountType.READER,"Different123",true)).isEmpty());
            assertFalse(validator.validate(new RegistrationRequest("an.demo","an@example.com","Password123","An","0901234567",AccountType.READER,"Password123",false)).isEmpty());
            assertFalse(validator.validate(request("An!","an123","an@example.com")).isEmpty());
            assertFalse(validator.validate(request("An","an_123","an@example.com")).isEmpty());
            assertFalse(validator.validate(request("An","an123","an..news@example.com")).isEmpty());
            assertFalse(validator.validate(request("An","an123","an@localhost")).isEmpty());
        }
    }
    @Test void phonesUseCountrySpecificRules() {
        assertEquals("+84901234567",AuthenticationService.validatePhone("0901234567"));
        assertEquals("+84901234567",AuthenticationService.validatePhone("84901234567"));
        assertEquals("+12025550123",AuthenticationService.validatePhone("12025550123"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->AuthenticationService.validatePhone("090123456789"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->AuthenticationService.validatePhone("abc1234567"));
    }
    @Test void duplicateUsernameIsRejectedBeforeSaving() {
        var users=mock(UserRepository.class);
        when(users.existsByUsernameIgnoreCase("an@123")).thenReturn(true);
        var service=new AuthenticationService(users,mock(RoleRepository.class),mock(PasswordEncoder.class));
        assertThrows(ConflictException.class,()->service.register(request("An","an@123","an@example.com")));
        verify(users,never()).save(any());
    }
    @Test void duplicateFieldsAreRejectedForReaderAndBusiness() {
        for(var type:AccountType.values()) {
            for(int mask=1;mask<=3;mask++) {
                var users=mock(UserRepository.class);
                when(users.existsByUsernameIgnoreCase("An.demo")).thenReturn((mask&1)!=0);
                when(users.existsByEmailIgnoreCase("an@example.com")).thenReturn((mask&2)!=0);
                var service=new AuthenticationService(users,mock(RoleRepository.class),mock(PasswordEncoder.class));
                var body=new RegistrationRequest("An.demo","AN@EXAMPLE.COM","Password123","An","",type,"Password123",true);
                var error=assertThrows(ConflictException.class,()->service.register(body));
                assertEquals((mask&1)!=0,error.getMessage().contains("đặt username khác"));
                assertEquals((mask&2)!=0,error.getMessage().contains("sử dụng email khác"));
                verify(users,never()).save(any());
            }
        }
    }
}
