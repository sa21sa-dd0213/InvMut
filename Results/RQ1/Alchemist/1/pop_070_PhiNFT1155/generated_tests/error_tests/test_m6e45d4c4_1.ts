import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m6e45d4c4 - onlyArtCreator modifier", function () {
  it("should allow the artist (who is not the owner) to call updateRoyalties", async function () {
    const [owner, artist, protocolFeeDest] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const nft = await PhiNFT1155Factory.deploy();
    await nft.waitForDeployment();
    
    // Deploy a mock PhiFactory to interact with PhiNFT1155
    // We need a minimal contract that implements the required interface
    const MockPhiFactory = await ethers.getContractFactory(
      "contracts/mocks/MockPhiFactory.sol:MockPhiFactory"
    );
    const factory = await MockPhiFactory.deploy();
    await factory.waitForDeployment();
    
    // Initialize the NFT contract
    await nft.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      protocolFeeDest.address
    );
    
    // Set the phiFactoryContract address in the NFT (via the owner)
    // Since initialize sets msg.sender as phiFactoryContract, we need to transfer ownership
    // or use a different approach. Let's set it directly via the owner calling initialize
    // Actually, initialize already sets phiFactoryContract = msg.sender, so owner is the factory
    
    // We need to create art from factory first to have a token with an artist
    // But createArtFromFactory is only callable by phiFactoryContract
    // Let's deploy a new NFT with owner as the factory
    
    const PhiNFT1155Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const nft2 = await PhiNFT1155Factory2.deploy();
    await nft2.waitForDeployment();
    
    // Initialize with owner as the phiFactoryContract
    await nft2.initialize(
      1,
      1,
      "test",
      protocolFeeDest.address
    );
    
    // Now owner is the phiFactoryContract, so we can call createArtFromFactory
    // First, we need to set up the mock factory to return proper values
    const artFee = ethers.parseEther("0.001");
    
    // Create art from factory (as owner/phiFactoryContract)
    const createTx = await nft2.createArtFromFactory(1, { value: artFee });
    await createTx.wait();
    
    // Now tokenId 1 exists, we need to associate it with an artist
    // The artist is stored in phiFactoryContract.artData(artId).artist
    // We need to set this up in our mock factory
    
    // Since we can't easily mock the factory, let's use a different approach:
    // Deploy with a real factory or use a simpler test
    
    // Alternative: Test the modifier directly by calling updateRoyalties
    // The artist is stored in the phiFactory contract, which we don't control
    // Let's check if there's a way to set the artist
    
    // Actually, looking at the code, the artist comes from phiFactoryContract.artData(artId).artist
    // We need to mock this properly
    
    // Let's create a simple test that demonstrates the mutant behavior
    // We'll deploy the contract and try to call updateRoyalties as the artist
    
    // For this test, we need the phiFactoryContract to return artist address
    // Since we can't easily set this, let's test the revert behavior directly
    
    // The mutant changes: if (msg.sender == artist && msg.sender != owner()) revert NotArtCreator();
    // Original: if (msg.sender != artist && msg.sender != owner()) revert NotArtCreator();
    
    // So in the mutant, if msg.sender == artist AND msg.sender != owner, it reverts
    // In the original, if msg.sender != artist AND msg.sender != owner, it reverts
    
    // Therefore, if we call as the artist (who is not the owner), the mutant reverts but original doesn't
    
    // Let's verify by calling updateRoyalties as the owner first (should work in both)
    const RoyaltyConfig = {
      royaltyBPS: 500,
      royaltyRecipient: artist.address
    };
    
    // Owner calls updateRoyalties - should work in both original and mutant
    // since owner != artist check doesn't apply to owner
    
    // Actually we need a valid tokenId that exists
    // Let's check if we can create art from factory properly
    
    // Simpler approach: test that the artist can call updateRoyalties
    // We need the phiFactoryContract to return artist address for the artId
    
    // Let's deploy a proper mock
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Deploy new NFT
    const NFTFactory = await ethers.getContractFactory("PhiNFT1155");
    const nft3 = await NFTFactory.deploy();
    await nft3.waitForDeployment();
    
    // Initialize with mockFactory as the phiFactoryContract
    await nft3.initialize(1, 1, "test", protocolFeeDest.address);
    
    // Set the art data in mock factory
    const artData = {
      credId: 1,
      credCreator: owner.address,
      credChainId: 1,
      verificationType: "test",
      uri: "test://uri",
      artAddress: await nft3.getAddress(),
      tokenId: 1,
      artist: artist.address,
      receiver: artist.address,
      royalties: { royaltyBPS: 500, royaltyRecipient: ethers.ZeroAddress },
      maxSupply: 100,
      mintFee: ethers.parseEther("0.01"),
      startTime: 0,
      endTime: 9999999999,
      numberMinted: 0,
      soulBounded: false
    };
    
    await mockFactory.setArtData(1, artData);
    await mockFactory.setArtCreateFee(ethers.parseEther("0.001"));
    
    // Create art from factory
    const createTx2 = await nft3.createArtFromFactory(1, { value: ethers.parseEther("0.001") });
    await createTx2.wait();
    
    // Now tokenId 1 exists with artist = artist.address
    
    // Test: artist (who is not the owner) calls updateRoyalties
    // In the original: should succeed because msg.sender == artist
    // In the mutant: should revert because msg.sender == artist AND msg.sender != owner
    
    const config = {
      royaltyBPS: 1000,
      royaltyRecipient: artist.address
    };
    
    // In the original contract, this should NOT revert
    // In the mutant, this SHOULD revert with NotArtCreator()
    // So we expect it to succeed (which kills the mutant that would revert)
    
    await expect(
      nft3.connect(artist).updateRoyalties(1, config)
    ).to.not.be.reverted;
  });
});