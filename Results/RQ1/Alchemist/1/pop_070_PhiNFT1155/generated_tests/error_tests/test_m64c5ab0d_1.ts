import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - onlyArtCreator modifier", function () {
    it("should allow art creator to call updateRoyalties, but mutant always reverts", async function () {
        const [owner, artist, addr1] = await ethers.getSigners();
        
        // Deploy PhiNFT1155
        const Factory = await ethers.getContractFactory("PhiNFT1155");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Initialize the contract
        const credChainId = 1;
        const credId = 1;
        const verificationType = "SIGNATURE";
        const protocolFeeDest = addr1.address;
        
        await instance.initialize(
            credChainId,
            credId,
            verificationType,
            protocolFeeDest
        );
        
        // Get the PhiFactory address that was set during initialization (msg.sender = owner)
        const phiFactoryAddress = await instance.phiFactoryContract();
        const phiFactory = await ethers.getContractAt("IPhiFactory", phiFactoryAddress);
        
        // We need to simulate creating art from factory to set up the token
        // First, get the artCreateFee
        const artCreateFee = await phiFactory.artCreateFee();
        
        // Create art from factory (onlyPhiFactory can call, so we need to impersonate or use a different approach)
        // Since we can't easily impersonate the factory, let's use the owner to set up test data
        // We'll directly mint a token to simulate art creation
        
        // Get the current tokenId counter
        const tokenIdCounter = await instance.tokenIdCounter();
        const artId = 1;
        
        // Create art via factory - we need to call createArtFromFactory
        // But only phiFactory can call it, so let's use a different approach
        // We'll test the modifier by checking if we can call updateRoyalties
        
        // First, we need a token to exist. Let's mint one directly via _mint
        // Since _mint is internal, we'll use the claimFromFactory path
        // Actually, let's just test the modifier logic directly
        
        // The mutant changes the condition to always revert, so any call to updateRoyalties
        // should fail. Let's verify the original behavior works for artist
        
        // Deploy a mock phiFactory to set up proper state
        const MockFactory = await ethers.getContractFactory("IPhiFactory");
        
        // Create art data structure
        const artData = {
            credId: 1,
            credCreator: artist.address,
            credChainId: 1,
            verificationType: "SIGNATURE",
            uri: "https://example.com/token",
            artAddress: await instance.getAddress(),
            tokenId: 1,
            artist: artist.address,
            receiver: artist.address,
            royalties: { royaltyBPS: 500, royaltyRecipient: artist.address },
            maxSupply: 100,
            mintFee: ethers.parseEther("0.01"),
            startTime: 0,
            endTime: 0,
            numberMinted: 0,
            soulBounded: false
        };
        
        // We need to set up the mapping _artIdToTokenId and _tokenIdToArtId
        // Since these are private, we'll use the createArtFromFactory function
        // But we need to be the phiFactory to call it
        
        // Alternative: test the modifier by directly calling updateRoyalties
        // with the artist address, which should work in original but fail in mutant
        
        // First ensure we have a tokenId mapping by creating art through factory
        // Let's use owner to call createArtFromFactory (simulating factory)
        
        // Actually, let's just test that the modifier reverts for unauthorized users
        // and should NOT revert for the artist in the original code
        
        const royaltyConfig = {
            royaltyBPS: 1000,
            royaltyRecipient: artist.address
        };
        
        // In the original code, calling updateRoyalties as the artist should work
        // In the mutant, it will always revert because condition is always true
        
        // Try to call updateRoyalties as the artist (should succeed in original, fail in mutant)
        await expect(
            instance.connect(artist).updateRoyalties(1, royaltyConfig)
        ).to.be.revertedWith("NotArtCreator");
        
        // The above test will pass on the mutant (because it always reverts)
        // But we need a test that fails on the mutant
        
        // Let's try with owner (who should also be allowed)
        await expect(
            instance.connect(owner).updateRoyalties(1, royaltyConfig)
        ).to.be.revertedWith("NotArtCreator");
        
        // Both calls should revert in mutant, but in original only non-artist/non-owner would revert
        // The test that would kill the mutant is one that expects success for a legitimate caller
        
        // Since we can't easily set up the internal mappings, let's test the modifier
        // by checking that calling with an unauthorized address reverts (both versions)
        // and calling with authorized address succeeds (only original)
        
        // The key insight: in the mutant, updateRoyalties ALWAYS reverts
        // In the original, it only reverts if caller is not artist and not owner
        
        // So a test that calls updateRoyalties with the artist and expects success
        // will pass on original but fail on mutant
        
        // However, we need the internal mappings to be set up for this to work
        // Let's create a scenario where we can verify this
        
        // For the test to be valid, we need a tokenId that has a valid artId mapping
        // We can't directly set private mappings, so let's use a different approach
        
        // Actually, let's just test the modifier behavior by checking revert messages
        // The mutant will always revert with "NotArtCreator" regardless of caller
        
        // A test that kills the mutant: call updateRoyalties as owner with any tokenId
        // In original: reverts because tokenId has no mapping (InValdidTokenId or similar)
        // Wait, actually it would check the modifier first, then _updateRoyalties
        
        // Let me re-read the modifier: it checks msg.sender != artist && msg.sender != owner()
        // If the tokenId doesn't exist, _tokenIdToArtId[tokenId_] returns 0
        // Then phiFactoryContract.artData(0) might fail
        
        // The simplest test: call updateRoyalties as the owner with a non-existent tokenId
        // In original: will revert because the art data lookup fails (not because of modifier)
        // In mutant: will revert because of the modifier (always true)
        
        // Both revert, so this doesn't differentiate
        
        // Better approach: we need a valid tokenId that exists
        // Let's simulate art creation by calling createArtFromFactory
        
        // We need to be the phiFactory to call createArtFromFactory
        // Since phiFactory is set to owner during initialization, owner can call it
        
        // Call createArtFromFactory as the phiFactory (which is the owner)
        const createTx = await instance.connect(owner).createArtFromFactory(1, {
            value: artCreateFee
        });
        await createTx.wait();
        
        // Now tokenId 1 should exist with artId 1
        const createdTokenId = await instance.tokenIdCounter();
        // tokenIdCounter should now be 2 (since it was incremented)
        
        // Now try calling updateRoyalties as the artist for tokenId 1
        // In original: should succeed because artist is the msg.sender
        // Wait, the artist for artId 1 is not set because we didn't go through the real factory
        // The artData would return default values, so artist would be address(0)
        
        // Let's try with owner who is the phiFactory and also the contract owner
        // In original: owner() == owner, so it should pass the modifier
        // In mutant: always reverts
        
        await expect(
            instance.connect(owner).updateRoyalties(1, royaltyConfig)
        ).to.not.be.reverted;
        
        // This test would pass on original (owner can call updateRoyalties for tokenId 1)
        // But fail on mutant (always reverts)
    });
});