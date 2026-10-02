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

        // Create art from factory (onlyPhiFactory can call, so we need to use the factory's address)
        // The factory is the owner since msg.sender was owner during initialization
        // But onlyPhiFactory checks msg.sender == address(phiFactoryContract)
        // Since phiFactoryContract is set to owner, we can call from owner

        // Get the current tokenId counter
        const tokenIdCounter = await instance.tokenIdCounter();
        const artId = 1;

        // Create art via factory - call createArtFromFactory as the phiFactory (which is owner)
        const createTx = await instance.connect(owner).createArtFromFactory(artId, {
            value: artCreateFee
        });
        await createTx.wait();

        // Now tokenId 1 should exist with artId 1
        const createdTokenId = await instance.tokenIdCounter();
        // tokenIdCounter should now be 2 (since it was incremented)

        const royaltyConfig = {
            royaltyBPS: 1000,
            royaltyRecipient: artist.address
        };

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