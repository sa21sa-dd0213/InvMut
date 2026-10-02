import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m6e45d4c4 - onlyArtCreator modifier", function () {
  it("should allow the artist (who is not the owner) to call updateRoyalties", async function () {
    const [owner, artist, protocolFeeDest] = await ethers.getSigners();

    // Deploy a mock PhiFactory
    const MockPhiFactory = await ethers.getContractFactory(
      "contracts/mocks/MockPhiFactory.sol:MockPhiFactory"
    );
    const factory = await MockPhiFactory.deploy();
    await factory.waitForDeployment();

    // Deploy PhiNFT1155
    const PhiNFT1155Factory = await ethers.getContractFactory("PhiNFT1155");
    const nft = await PhiNFT1155Factory.deploy();
    await nft.waitForDeployment();

    // Initialize the NFT contract with the mock factory as the phiFactoryContract
    await nft.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      protocolFeeDest.address
    );

    // Set up the art data in mock factory
    const artData = {
      credId: 1,
      credCreator: owner.address,
      credChainId: 1,
      verificationType: "test",
      uri: "test://uri",
      artAddress: await nft.getAddress(),
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

    await factory.setArtData(1, artData);
    await factory.setArtCreateFee(ethers.parseEther("0.001"));

    // Create art from factory (as owner/phiFactoryContract)
    const createTx = await nft.createArtFromFactory(1, { value: ethers.parseEther("0.001") });
    await createTx.wait();

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
      nft.connect(artist).updateRoyalties(1, config)
    ).to.not.be.reverted;
  });
});