import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mf1ea1870 detection", function () {
  it("should detect mutant by measuring gas cost difference between first and second mint for same address", async function () {
    const [owner, minter, ref, verifier, protocolFeeDest] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest.address);
    
    // Deploy a mock PhiFactory to enable minting
    // We need to create an art first via the factory to test the mint function
    // Since the mint function is internal, we need to call it through claimFromFactory
    // which requires a PhiFactory that has art data set up
    
    // To test the internal mint function directly, we'll use the claimFromFactory path
    // First, we need to set up a minimal mock factory contract
    const MockFactory = await ethers.getContractFactory("contracts/test/MockPhiFactory.sol:MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Set the phiFactoryContract address (this would normally be set in initialize)
    // Since phiFactoryContract is set to msg.sender in initialize, we need to redeploy
    // or use a different approach
    
    // Alternative approach: Deploy a new instance where the owner is the factory
    // For this test, we'll directly test the gas optimization in the mint function
    // by analyzing the storage write pattern
    
    // The mint function does: if (!minted[to_]) { minted[to_] = true; }
    // Original: skips SSTORE on second mint (saves gas)
    // Mutant: always does SSTORE (wastes gas)
    
    // To test this, we need to simulate the mint function behavior
    // We can call the mint function indirectly through the contract's internal paths
    
    // First, let's create an art through the factory mechanism
    // We need to call createArtFromFactory first to set up token ID mapping
    
    // Set up mock factory return values
    const artId = 1;
    const artCreateFee = ethers.parseEther("0.001");
    const mintFee = ethers.parseEther("0.01");
    
    // Deploy a proper mock that returns expected values
    const MockFactoryFull = await ethers.getContractFactory("contracts/test/MockPhiFactoryFull.sol:MockPhiFactoryFull");
    const mockFactoryFull = await MockFactoryFull.deploy();
    await mockFactoryFull.waitForDeployment();
    
    // We need to set phiFactoryContract to the mock factory
    // Since initialize sets it to msg.sender, we need to deploy from the factory address
    // or use storage manipulation
    
    // Simplified approach: Use the fact that minted mapping is public
    // We can directly call _mint through the internal function by using the claimFromFactory path
    
    // Create art first
    const artFee = ethers.parseEther("0.001");
    await instance.createArtFromFactory(artId, { value: artFee });
    
    // Now call claimFromFactory to trigger mint
    const quantity = 1;
    const imageURI = "ipfs://test";
    const data = ethers.hexlify(ethers.toUtf8Bytes("test"));
    
    // First mint - should set minted[minter] = true
    const tx1 = await instance.connect(owner).claimFromFactory(
      artId,
      minter.address,
      ref.address,
      verifier.address,
      quantity,
      data,
      imageURI,
      { value: mintFee }
    );
    const receipt1 = await tx1.wait();
    const gasUsed1 = receipt1.gasUsed;
    
    // Second mint for same address - original should skip SSTORE, mutant should not
    const tx2 = await instance.connect(owner).claimFromFactory(
      artId,
      minter.address,
      ref.address,
      verifier.address,
      quantity,
      data,
      imageURI,
      { value: mintFee }
    );
    const receipt2 = await tx2.wait();
    const gasUsed2 = receipt2.gasUsed;
    
    // In the original, gasUsed2 should be less than gasUsed1 due to skipped SSTORE
    // In the mutant, gasUsed2 should be approximately equal to gasUsed1
    // The difference should be at least the cost of one SSTORE (~20000 gas)
    expect(gasUsed2).to.be.lessThan(gasUsed1.sub(10000));
  });
});