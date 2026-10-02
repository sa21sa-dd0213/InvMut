import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant m5fe82436 test", function () {
  it("should detect the exponentiation operator mutation by verifying the transferred amount", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments for airDrop)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Create a mock token that implements transferFrom
    // We need a simple ERC20-like contract to test the transfer function
    const MockTokenFactory = await ethers.getContractFactory("contracts/MockToken.sol:MockToken");
    const mockToken = await MockTokenFactory.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();
    
    // Mint tokens to 'from' address and approve the airDrop contract
    const mintAmount = ethers.parseUnits("1000", 18);
    await mockToken.mint(from.address, mintAmount);
    await mockToken.connect(from).approve(await instance.getAddress(), ethers.MaxUint256);
    
    // Call transfer with v=2 and _decimals=1 (original: v * 10**1 = 20, mutant: v ** 10**1 = 1024)
    const v = 2;
    const _decimals = 1;
    const recipients = [to.address];
    
    // Get balances before
    const balanceBeforeFrom = await mockToken.balanceOf(from.address);
    const balanceBeforeTo = await mockToken.balanceOf(to.address);
    
    // Execute the transfer
    const tx = await instance.connect(owner).transfer(
      from.address,
      await mockToken.getAddress(),
      recipients,
      v,
      _decimals
    );
    await tx.wait();
    
    // Get balances after
    const balanceAfterFrom = await mockToken.balanceOf(from.address);
    const balanceAfterTo = await mockToken.balanceOf(to.address);
    
    // In the original contract, _value = 2 * 10**1 = 20 tokens should be transferred
    // In the mutant, _value = 2 ** 10**1 = 1024 tokens would be transferred
    // Since from only has 1000 tokens, the mutant would revert due to insufficient balance
    // The original should succeed with a transfer of 20 tokens
    
    // If the original passes, from loses 20 tokens and to gains 20 tokens
    // If the mutant executes (unlikely due to revert), the amounts would be different
    expect(balanceAfterFrom).to.equal(balanceBeforeFrom - ethers.parseUnits("20", 18));
    expect(balanceAfterTo).to.equal(balanceBeforeTo + ethers.parseUnits("20", 18));
  });
});