import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mc13493e8 - _update function", function () {
  it("should detect mutant that removes super._update call by checking balance and total supply after mint", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Get the phiFactoryContract address (set during initialize to deployer)
    const phiFactory = await instance.phiFactoryContract();
    
    // Deploy a mock PhiFactory to allow minting
    const MockPhiFactory = await ethers.getContractFactory("IPhiFactory");
    // Note: We need a real contract, so let's deploy a simple one
    const SimpleFactory = await ethers.getContractFactory("SimplePhiFactory");
    const factory = await SimpleFactory.deploy();
    await factory.waitForDeployment();
    
    // Set the phiFactoryContract to our mock
    // We can't directly set it, so we'll use the initialize path
    // For testing, we'll deploy a new instance with a proper factory
    
    // Create a simple test by directly calling _mint through a helper
    // Since _mint is internal, we need to use the mint function via claimFromFactory
    
    // Actually, let's test the _update function by triggering it through safeTransferFrom
    // First, we need to mint tokens to test
    
    // Let's use a simpler approach - test that _update works by checking that 
    // pausing prevents transfers (this tests the pausable aspect of _update)
    
    // Pause the contract
    await instance.pause();
    
    // Try to call safeTransferFrom - it should revert because _update checks whenNotPaused
    // If the mutant removed super._update, the pausable check won't execute
    const tokenId = 1;
    
    // First mint some tokens to owner before pausing
    // Since we can't easily mint, let's check that the _update function's
    // balance update logic works by using the totalSupply check
    
    // Deploy with a mock factory that allows us to test
    const MockFactory = await ethers.getContractFactory("SimplePhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Deploy fresh instance
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    await instance2.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Get the initial total supply
    const initialTotalSupply = await instance2.totalSupply();
    expect(initialTotalSupply).to.equal(0);
    
    // The _update function is called internally by _mint
    // If the mutant removed super._update, the total supply won't be updated
    // when tokens are minted
    
    // We need to trigger _mint. Since it's internal, we need to use claimFromFactory
    // which calls the internal mint function
    
    // Let's test by checking that balance updates work correctly
    // We'll deploy a minimal test contract that exposes _update
    
    const TestPhiNFT1155 = await ethers.getContractFactory("TestPhiNFT1155");
    const testInstance = await TestPhiNFT1155.deploy();
    await testInstance.waitForDeployment();
    await testInstance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Call the test function that triggers _update through mint
    const testTokenId = 1;
    const testQuantity = 5;
    
    await testInstance.testMint(addr1.address, testTokenId, testQuantity);
    
    // Check balance - if mutant removed super._update, balance will be 0
    const balance = await testInstance.balanceOf(addr1.address, testTokenId);
    expect(balance).to.equal(testQuantity);
    
    // Check total supply - if mutant removed super._update, total supply will be 0
    const totalSupply = await testInstance.totalSupply(testTokenId);
    expect(totalSupply).to.equal(testQuantity);
    
    // Also test that pausing works through _update
    await testInstance.pause();
    
    // Try to mint another token - should revert if _update checks paused state
    await expect(
      testInstance.testMint(addr1.address, testTokenId + 1, 1)
    ).to.be.reverted;
  });
});

// Helper contract to expose internal functions for testing
// This should be deployed as a separate contract
contract TestPhiNFT1155 is PhiNFT1155 {
    function testMint(address to, uint256 tokenId, uint256 quantity) external {
        // Directly call the internal _mint which calls _update
        // We need to set up the necessary state first
        _mint(to, tokenId, quantity, "");
    }
}