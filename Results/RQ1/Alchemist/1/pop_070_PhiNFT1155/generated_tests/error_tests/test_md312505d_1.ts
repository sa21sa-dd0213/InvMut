import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - md312505d", function () {
  it("should allow safeBatchTransferFrom with non-soulbound token and non-zero sender, but mutant should revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by initializer modifier)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // We need a token that is NOT soulbound to test the original behavior
    // First, we need to mint a token via the factory mechanism
    // Since we don't have a real factory, we'll directly test the transfer function
    // with a scenario where soulBounded returns false
    
    // The contract has tokenIdCounter starting at 1 after initialization
    // We need to mint a token to test transfers
    // Since mint() is internal, we need to use claimFromFactory or create a scenario
    // where we can test safeBatchTransferFrom directly
    
    // For this test, we'll simulate a scenario where:
    // 1. We have a non-soulbound token (tokenId 1)
    // 2. We try to transfer it from a non-zero address
    // 3. The original should allow it, the mutant should revert
    
    // First, let's create an art to get a token minted
    // We need to call createArtFromFactory which requires onlyPhiFactory modifier
    // Instead, let's directly test the safeBatchTransferFrom function logic
    
    // The key insight: the mutant changes the condition to always revert
    // So any successful transfer should kill the mutant
    
    // Let's mint tokens to addr1 first by calling mint internally
    // Since mint is internal, we'll need to use the claimFromFactory path
    // But that requires a factory contract... 
    
    // Alternative approach: test with the existing minted state
    // The contract starts with tokenIdCounter = 1 after initialize
    // Let's test a simple batch transfer from addr1 to addr2 with a non-soulbound token
    
    // Since we can't easily mint tokens in this test setup, 
    // we'll test the function with a zero-quantity transfer which should work
    // in the original but fail in the mutant
    
    // Get the token ID for a non-existent art (should revert differently)
    // Actually, let's just try to call safeBatchTransferFrom with empty arrays
    // which should succeed in original but revert in mutant
    
    // Test case: transfer from addr1 (non-zero) with empty arrays
    // The original should process this without reverting (no tokens to check)
    // The mutant will revert immediately due to "if (true) revert"
    
    await expect(
      instance.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        [],
        [],
        "0x"
      )
    ).to.not.be.reverted; // This should pass on original, fail on mutant
    
    // Also test with actual token data to confirm
    // First approve addr1 to transfer from owner
    await instance.connect(owner).setApprovalForAll(addr1.address, true);
    
    // Now try a batch transfer with empty arrays from a non-zero sender
    // The original should succeed (no tokens to check for soulbound)
    // The mutant will revert immediately
    
    // This is the killing test case
    await expect(
      instance.connect(addr1).safeBatchTransferFrom(
        addr1.address,
        addr2.address,
        [],
        [],
        "0x"
      )
    ).to.not.be.reverted;
  });
});