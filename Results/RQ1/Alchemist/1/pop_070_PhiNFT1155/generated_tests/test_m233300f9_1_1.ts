import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m233300f9 - uri function", function () {
  it("should return the advanced token URI when set via mint, but mutant returns default URI instead", async function () {
    const [owner, minter, phiFactory, protocolFeeDest] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest.address);
    
    // Now owner is the phiFactoryContract (since initialize sets phiFactoryContract = msg.sender)
    // We need to create an art first to have a valid tokenId
    // The createArtFromFactory requires msg.sender to be phiFactoryContract
    // So owner can call it
    
    // Create art (this will create tokenId = 1)
    const artId = 1;
    await instance.createArtFromFactory(artId, { value: 0 });
    
    // Now we need to mint tokens to set advancedTokenURI
    // The mint function is internal, so we need to call claimFromFactory
    // claimFromFactory requires phiFactory to call it, and we set owner as phiFactory
    
    // Set up mock data for claimFromFactory
    const tokenId = 1; // This should be the tokenId created above
    const quantity = 1;
    const imageURI = "advanced-uri-test-123";
    const data = ethers.zeroPadValue(ethers.toBeHex(42), 32);
    
    // Call claimFromFactory as owner (which is phiFactoryContract)
    await instance.claimFromFactory(
      artId,
      minter.address,
      ethers.ZeroAddress, // ref
      ethers.ZeroAddress, // verifier
      quantity,
      data,
      imageURI,
      { value: 0 }
    );
    
    // Now test the two-parameter uri function
    // The advanced token URI should be set for this minter and tokenId
    const resultURI = await instance.uri(tokenId, minter.address);
    
    // The original contract should return "advanced-uri-test-123"
    // The mutant (which uses "if (false)") will return the factory's default URI
    expect(resultURI).to.equal(imageURI);
  });
});