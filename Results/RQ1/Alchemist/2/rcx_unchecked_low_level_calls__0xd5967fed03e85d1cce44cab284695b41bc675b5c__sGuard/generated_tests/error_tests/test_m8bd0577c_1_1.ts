import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8bd0577c test", function () {
  it("should kill mutant by verifying transfers occur with non-empty recipient array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Owner approves the demo contract to spend tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Get initial balances
    const initialBalanceAddr1 = await token.balanceOf(addr1.address);
    const initialBalanceAddr2 = await token.balanceOf(addr2.address);

    // Call transfer with non-empty array of recipients
    const recipients = [addr1.address, addr2.address];
    const tx = await instance.transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("10")
    );
    await tx.wait();

    // Check that transfers actually occurred - this will fail on mutant
    // because the mutant's loop condition i > _tos.length means no transfers happen
    const finalBalanceAddr1 = await token.balanceOf(addr1.address);
    const finalBalanceAddr2 = await token.balanceOf(addr2.address);

    expect(finalBalanceAddr1).to.equal(initialBalanceAddr1 + ethers.parseEther("10"));
    expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + ethers.parseEther("10"));
  });
});