import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m814e6338", function () {
  it("should revert when loop condition is broken (mutant uses > instead of <)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token that implements transferFrom to detect calls
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 so transferFrom can succeed
    await token.mint(addr1.address, ethers.parseEther("100"));

    // Approve the demo contract to spend tokens from addr1
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("10"));

    // Prepare a non-empty array of recipients
    const recipients = [addr2.address];

    // The mutant's loop condition i > _tos.length is false for any non-empty array,
    // so the loop never executes and the function returns true without calling transferFrom.
    // The original would call transferFrom and succeed. To kill the mutant, we assert
    // that the transferFrom was NOT called (i.e., balance remains unchanged).
    const balanceBefore = await token.balanceOf(addr2.address);
    
    // Call the mutated transfer function
    await instance.connect(owner).transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("1")
    );

    const balanceAfter = await token.balanceOf(addr2.address);
    
    // If the loop never executed (mutant), balanceAfter equals balanceBefore.
    // If the loop executed (original), balanceAfter > balanceBefore.
    // Therefore, expecting balanceAfter > balanceBefore will fail on the mutant (kill it).
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});