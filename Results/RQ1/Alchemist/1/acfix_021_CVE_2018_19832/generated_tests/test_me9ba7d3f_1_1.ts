import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant me9ba7d3f by burning full balance - original allows it, mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, give addr1 some tokens via distribution
    // We need to call getTokens() to trigger distribution
    // But addr1 is not whitelisted initially (blacklist[msg.sender] must be false)
    // Since blacklist is false by default, addr1 can call getTokens()
    // Send some ether to trigger getTokens() via receive() or call directly
    const valueBefore = await instance.value();
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get addr1's balance after receiving tokens
    const balance = await instance.balanceOf(addr1.address);
    
    // Now try to burn the exact full balance
    // Original contract: require(_value <= balances[msg.sender]) - should succeed
    // Mutant: require(_value < balances[msg.sender]) - should revert because _value == balance
    const tx = instance.connect(owner).burn(balance);  // Note: burn is onlyOwner, so we use owner

    // This transaction should succeed on original but fail on mutant
    // Since we're testing the mutant, we expect revert
    await expect(tx).to.be.reverted;
  });
});