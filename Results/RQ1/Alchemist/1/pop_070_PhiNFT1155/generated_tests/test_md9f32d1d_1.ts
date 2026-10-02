import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - supportsInterface", function () {
  it("should return true for IPhiNFT1155 interface ID (detects mutant md9f32d1d)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor requires no arguments, but has _disableInitializers())
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The interface ID for IPhiNFT1155 - computed from the 4-byte selector
    // IPhiNFT1155 interface includes: getTokenIdFromFactoryArtId, getFactoryArtId, 
    // verificationType, pause, unPause, updateRoyalties, tokenIdCounter, credId, initialize
    // We compute it from the interface definition
    const IPhiNFT1155 = new ethers.Interface([
      "function initialize(uint256 credChainId, uint256 credId, string memory verificationType, address protocoFeeDest) external",
      "function tokenIdCounter() external view returns (uint256)",
      "function credId() external view returns (uint256)",
      "function getTokenIdFromFactoryArtId(uint256 artId) external view returns (uint256)",
      "function getFactoryArtId(uint256 tokenId_) external view returns (uint256)",
      "function verificationType() external view returns (string memory)",
      "function pause() external",
      "function unPause() external",
      "function updateRoyalties(uint256 tokenId, tuple(uint32 royaltyBPS, address royaltyRecipient) memory configuration) external"
    ]);
    
    const interfaceId = IPhiNFT1155.getFunction("initialize").selector.slice(0, 10);
    
    // In the original, supportsInterface should return true for IPhiNFT1155 interface
    // The mutant returns false because it uses != instead of ==
    const result = await instance.supportsInterface(interfaceId);
    
    // This assertion will PASS on the original (returns true) 
    // and FAIL on the mutant (returns false due to !=)
    expect(result).to.be.true;
  });
});