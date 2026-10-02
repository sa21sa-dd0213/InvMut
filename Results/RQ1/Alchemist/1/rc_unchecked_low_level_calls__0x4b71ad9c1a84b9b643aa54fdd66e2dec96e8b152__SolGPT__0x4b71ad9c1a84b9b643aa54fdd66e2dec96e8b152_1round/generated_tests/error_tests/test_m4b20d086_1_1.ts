import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 detection", function () {
  it("should execute transfers when _tos array has elements, mutant fails because loop condition is inverted", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock ERC20 token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve the airPort contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Prepare test data: transfer 10 tokens from addr1 to addr2
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // Record balances before
    const balanceBefore = await token.balanceOf(addr2.address);

    // Execute transfer via airPort contract
    await instance.connect(owner).transfer(
      addr1.address,
      token.target,
      recipients,
      amount
    );

    // Check balance after - original contract should transfer, mutant should not
    const balanceAfter = await token.balanceOf(addr2.address);

    // The original contract would increase addr2's balance by 10 tokens
    // The mutant with i>_tos.length would never execute the loop, so balance stays same
    expect(balanceAfter).to.equal(balanceBefore + amount);
  });
});