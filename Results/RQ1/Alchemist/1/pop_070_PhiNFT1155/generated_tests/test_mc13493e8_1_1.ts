import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mc13493e8 - _update function", function () {
  it("should detect mutant that removes super._update call by checking balance and total supply after mint", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the actual PhiNFT1155 contract
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Get the initial total supply
    const initialTotalSupply = await instance.totalSupply();
    expect(initialTotalSupply).to.equal(0);

    // Deploy a helper contract that extends PhiNFT1155 to expose _update through mint
    const TestPhiNFT1155Factory = await ethers.getContractFactory("TestPhiNFT1155");
    const testInstance = await TestPhiNFT1155Factory.deploy();
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

// Helper contract that extends PhiNFT1155 to expose internal functions for testing
contract TestPhiNFT1155 is PhiNFT1155 {
    function testMint(address to, uint256 tokenId, uint256 quantity) external {
        // Directly call the internal _mint which calls _update
        _mint(to, tokenId, quantity, "");
    }
}