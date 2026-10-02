import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - m14e39b1d", function () {
  it("should detect the division mutation in transferFrom by checking sender balance after transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First, we need to distribute tokens to addr1 so they have a balance to transfer from
    // Get the contract to distribute tokens via getTokens() - but addr1 needs to be whitelisted first
    // Since getTokens() requires blacklist[msg.sender] == false, addr1 can call it initially
    
    // Fund the contract with some ETH to allow getTokens() to work (it's payable)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Have addr1 call getTokens() to receive some tokens
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("0") });
    
    // Get addr1's balance after distribution
    const addr1BalanceBefore = await instance.balanceOf(addr1.address);
    expect(addr1BalanceBefore).to.be.gt(0);
    
    // Have addr1 approve owner to spend tokens on their behalf
    await instance.connect(addr1).approve(owner.address, addr1BalanceBefore);
    
    // Now execute transferFrom: owner transfers tokens from addr1 to addr2
    const transferAmount = ethers.parseEther("100"); // Use a fixed amount for testing
    const expectedNewBalance = addr1BalanceBefore - transferAmount;
    
    // Execute the transferFrom
    await instance.connect(owner).transferFrom(addr1.address, addr2.address, transferAmount);
    
    // Check addr1's balance after the transfer
    const addr1BalanceAfter = await instance.balanceOf(addr1.address);
    
    // In the original contract, this should equal expectedNewBalance
    // In the mutant, the division operator would produce a completely different result
    // For example, if addr1BalanceBefore = 1000e18 and transferAmount = 100e18,
    // original: 1000e18 - 100e18 = 900e18
    // mutant: 1000e18 / 100e18 = 10
    expect(addr1BalanceAfter).to.equal(expectedNewBalance);
  });
});