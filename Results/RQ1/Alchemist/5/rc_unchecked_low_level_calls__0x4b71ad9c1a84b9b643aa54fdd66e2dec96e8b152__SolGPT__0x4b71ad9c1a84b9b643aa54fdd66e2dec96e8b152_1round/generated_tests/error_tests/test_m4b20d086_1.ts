import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant test - m4b20d086", function () {
  it("should kill the mutant by verifying loop executes for non-empty _tos array", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to 'from' address and approve airPort contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await instance.getAddress(), mintAmount);
    
    // Setup: get initial balances
    const initialBalanceTo1 = await token.balanceOf(to1.address);
    const initialBalanceTo2 = await token.balanceOf(to2.address);
    
    // Create array of recipients
    const recipients = [to1.address, to2.address];
    const transferAmount = ethers.parseEther("10");
    
    // Call transfer function which should trigger transferFrom for each recipient
    const tx = await instance.connect(owner).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    await tx.wait();
    
    // Assert that tokens were actually transferred (original behavior)
    // If mutant is present (i>_tos.length), loop never executes and balances remain unchanged
    const finalBalanceTo1 = await token.balanceOf(to1.address);
    const finalBalanceTo2 = await token.balanceOf(to2.address);
    
    expect(finalBalanceTo1).to.equal(initialBalanceTo1 + transferAmount);
    expect(finalBalanceTo2).to.equal(initialBalanceTo2 + transferAmount);
    
    // Also verify from address lost tokens
    const finalBalanceFrom = await token.balanceOf(from.address);
    expect(finalBalanceFrom).to.equal(mintAmount - transferAmount * BigInt(2));
  });
});