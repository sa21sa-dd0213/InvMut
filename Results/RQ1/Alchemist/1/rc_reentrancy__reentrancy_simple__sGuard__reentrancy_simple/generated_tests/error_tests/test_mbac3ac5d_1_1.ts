import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - mbac3ac5d", function () {
  it("should kill mutant by detecting balance off-by-one error", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // User deposits exactly 1 ether
    const tx = await instance.connect(user).addToBalance({ value: depositAmount });
    await tx.wait();

    // Get recorded balance for user
    const balance = await instance.getBalance(user.address);

    // On original: balance should equal depositAmount
    // On mutant: balance will be depositAmount + 1 wei
    expect(balance).to.equal(depositAmount);
  });
});