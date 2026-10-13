package com.group5.premiumnews.service;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class AccountProfileServiceTests {
    private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4);
    private final String hash=encoder.encode("Original123");
    private AccountProfileService.Update request(String current,String next,String confirm){return new AccountProfileService.Update("An","an@example.com","0901234567",current,next,confirm);}
    @Test void currentPasswordMustMatch(){assertThrows(ResponseStatusException.class,()->AccountProfileService.validatePasswords(encoder,hash,request("Wrong123","","")));}
    @Test void newPasswordMustMatchConfirmationAndDiffer(){
        assertThrows(ResponseStatusException.class,()->AccountProfileService.validatePasswords(encoder,hash,request("Original123","Next12345","Different123")));
        assertThrows(ResponseStatusException.class,()->AccountProfileService.validatePasswords(encoder,hash,request("Original123","Original123","Original123")));
        assertDoesNotThrow(()->AccountProfileService.validatePasswords(encoder,hash,request("Original123","Next12345","Next12345")));
    }
    @Test void profileOnlyUpdateDoesNotRequireNewPassword(){assertDoesNotThrow(()->AccountProfileService.validatePasswords(encoder,hash,request("Original123","","")));}
}
