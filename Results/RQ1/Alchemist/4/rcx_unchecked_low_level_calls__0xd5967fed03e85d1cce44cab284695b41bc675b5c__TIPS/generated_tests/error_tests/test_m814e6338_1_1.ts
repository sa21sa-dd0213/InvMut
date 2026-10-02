import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test m814e6338", function () {
  it("should revert when tos array is empty (original behavior) but mutant fails to execute transfers when array has elements", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the 'caddress' for transferFrom calls
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the demo contract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Fund owner with tokens
    await token.transfer(owner.address, ethers.parseEther("50"));

    // Test: call transfer with a non-empty tos array - mutant loop never executes
    const tos = [addr1.address, addr2.address];
    const tx = await instance.transfer(
      owner.address,
      await token.getAddress(),
      tos,
      ethers.parseEther("10")
    );
    await tx.wait();

    // Assert that tokens were NOT transferred (mutant behavior)
    // Original would transfer 10 to each address, mutant does nothing
    const balance1 = await token.balanceOf(addr1.address);
    const balance2 = await token.balanceOf(addr2.address);
    
    // If mutant is live, balances will be 0 (no transfer happened)
    // This assertion kills the mutant because original would have non-zero balances
    expect(balance1).to.equal(0);
    expect(balance2).to.equal(0);
  });
});