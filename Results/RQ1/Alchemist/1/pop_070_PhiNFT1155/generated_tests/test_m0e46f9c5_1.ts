import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PhiNFT1155 mutant m0e46f9c5 detection", function () {
  it("should detect mutant by sending exact msg.value and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor has no arguments as per contract code)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy mock PhiFactory contract that we control for testing
    // We need a minimal implementation that returns expected values
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the NFT contract with required parameters
    // We need to set phiFactoryContract address first via initialization
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      addr2.address // protocolFeeDestination
    );
    
    // Get the mint fee for artId 1 (we need to set up art data in mock factory)
    const mintFee = ethers.parseEther("0.01");
    const quantity = 2;
    const totalFee = mintFee * BigInt(quantity);
    
    // Setup mock factory to return valid art data for claimFromFactory
    await mockFactory.setArtData(1, {
      artist: addr1.address,
      receiver: addr2.address,
      mintFee: mintFee,
      credId: 1,
      // other fields as needed
    });
    
    // Set up the artId to tokenId mapping via createArtFromFactory
    await instance.createArtFromFactory(1, { value: ethers.parseEther("0.001") });
    
    // Attempt claimFromFactory with exact msg.value = mintFee * quantity
    // The original should succeed, the mutant should fail
    const tx = instance.connect(addr1).claimFromFactory(
      1, // artId
      addr1.address, // minter
      addr2.address, // ref
      addr2.address, // verifier
      quantity, // quantity
      ethers.encodeBytes32String("test"), // data
      "ipfs://test" // imageURI
    );
    
    // Original: should succeed with exact msg.value
    // Mutant: adds 1 wei to msg.value, causing insufficient balance revert
    await expect(tx).to.not.be.reverted;
  });
});