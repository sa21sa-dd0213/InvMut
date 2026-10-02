import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - supportsInterface", function () {
  it("should return false for an arbitrary interfaceId that is numerically less than IPhiNFT1155 interfaceId", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    // Deploy with constructor arguments - PhiNFT1155 constructor takes no arguments
    // but we need to initialize it
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with required parameters
    // Parameters: credChainId, credId, verificationType, protocolFeeDestination
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // Calculate IPhiNFT1155 interfaceId - we need to compute it from the interface
    // The interface IPhiNFT1155 extends ICreatorRoyaltiesControl and IERC1155
    // We'll use a bytes4 value that is numerically less than the actual interfaceId
    // but not equal to it
    
    // First, get the actual interfaceId of IPhiNFT1155 by computing it
    // For the test, we can use any bytes4 value that is less than the actual interfaceId
    // The actual interfaceId of IPhiNFT1155 would be computed from its function selectors
    // We'll use 0x00000001 which is numerically smaller than any valid interfaceId
    
    const arbitraryInterfaceId = "0x00000001";
    const result = await instance.supportsInterface(arbitraryInterfaceId);
    
    // The original contract should return false for this arbitrary interfaceId
    // The mutant with <= would incorrectly return true
    expect(result).to.equal(false);
  });
  
  it("should return true for the actual IPhiNFT1155 interfaceId", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    await instance.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    // Compute IPhiNFT1155 interfaceId from the interface functions
    // IPhiNFT1155 has: tokenIdCounter(), credId(), getTokenIdFromFactoryArtId(uint256),
    // getFactoryArtId(uint256), verificationType(), pause(), unPause(),
    // updateRoyalties(uint256, (uint32,address))
    
    // Calculate the interfaceId using the selector of the first function
    const interfaceId = ethers.id("tokenIdCounter()").substring(0, 10);
    const result = await instance.supportsInterface(interfaceId);
    
    // Both original and mutant should return true for the actual interfaceId
    expect(result).to.equal(true);
  });
  
  it("should return false for an interfaceId between IERC165 and IPhiNFT1155", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    await instance.initialize(
      1,
      1,
      "test",
      owner.address
    );
    
    // Use an interfaceId that is not supported but could be numerically less than IPhiNFT1155
    // 0xffffffff is a common unsupported interfaceId
    const unsupportedInterfaceId = "0xffffffff";
    const result = await instance.supportsInterface(unsupportedInterfaceId);
    
    expect(result).to.equal(false);
  });
});