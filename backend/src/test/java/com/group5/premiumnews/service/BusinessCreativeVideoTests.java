package com.group5.premiumnews.service;

import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import java.nio.ByteBuffer;
import java.util.*;
import org.jcodec.api.SequenceEncoder;
import org.jcodec.common.io.ByteBufferSeekableByteChannel;
import org.jcodec.common.model.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BusinessCreativeVideoTests {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private final BusinessWorkspaceService business=mock(BusinessWorkspaceService.class);
    private final BusinessAssetStorage storage=mock(BusinessAssetStorage.class);
    private final AuthenticatedUserPrincipal user=new AuthenticatedUserPrincipal(1L,"qa","qa@example.com","unused","QA",2L,true,List.of());

    private BusinessFileService service() throws Exception {
        when(business.ownedCampaign(user,9L,true)).thenReturn(Map.of("campaign_id",9L,"contract_id",7L,"campaign_name","QA video","edit_version",1,"status","DRAFT"));
        when(jdbc.queryForMap(anyString(),eq(7L))).thenReturn(Map.of("width_px",320,"height_px",180));
        when(storage.put(any(byte[].class),eq("video/mp4"),eq("mp4"))).thenReturn("00000000-0000-0000-0000-000000000001.mp4");
        when(jdbc.queryForObject(anyString(),eq(Integer.class),eq(9L))).thenReturn(1);
        when(jdbc.queryForObject(anyString(),eq(Long.class),eq(9L),eq(1))).thenReturn(77L);
        return new BusinessFileService(jdbc,business,storage);
    }
    /** Sinh MP4 thật trong bộ nhớ để kiểm tra metadata parser, không tin phần mở rộng hoặc MIME do client gửi. */
    private byte[] video(Rational fps) throws Exception {
        var channel=ByteBufferSeekableByteChannel.writeToByteBuffer(ByteBuffer.allocate(1024*1024));
        var encoder=SequenceEncoder.createWithFps(channel,fps);
        encoder.encodeNativeFrame(Picture.create(320,180,ColorSpace.RGB));encoder.finish();
        var bytes=channel.getContents();byte[] result=new byte[bytes.remaining()];bytes.get(result);return result;
    }
    @Test void actualMp4IsStoredAsVideoEvenIfClientClaimsImage() throws Exception {
        var result=service().creative(user,9L,new MockMultipartFile("file","false.png","image/png",video(Rational.R(1,1))),"https://example.com",1);
        assertEquals(77L,result.get("id"));
        verify(storage).put(any(byte[].class),eq("video/mp4"),eq("mp4"));
        verify(jdbc).update("UPDATE ad_creatives SET creative_type=? WHERE creative_id=?","VIDEO",77L);
    }
    @Test void overSixtySecondsCannotReachStorage() throws Exception {
        var files=service();var file=new MockMultipartFile("file","long.mp4","video/mp4",video(Rational.R(1,61)));
        assertThrows(InvalidStateTransitionException.class,()->files.creative(user,9L,file,"https://example.com",1));
        verify(storage,never()).put(any(),anyString(),anyString());
    }
    @Test void fakeMp4HeaderCannotReachStorage() throws Exception {
        var files=service();byte[] bytes=new byte[32];System.arraycopy("ftyp".getBytes(java.nio.charset.StandardCharsets.US_ASCII),0,bytes,4,4);
        assertThrows(InvalidStateTransitionException.class,()->files.creative(user,9L,new MockMultipartFile("file","fake.mp4","video/mp4",bytes),"https://example.com",1));
        verify(storage,never()).put(any(),anyString(),anyString());
    }
}
