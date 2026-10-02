import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mbfd38045", function () {
  it("should kill mutant by verifying withdrawal works when credit > 0", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    const userBalanceBefore = await ethers.provider.getBalance(user.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    await instance.connect(user).deposit({ value: depositAmount });

    // Verify deposit was recorded
    expect(await ethers.provider.getBalance(contractAddress)).to.equal(contractBalanceBefore + depositAmount);

    // User calls withdrawAll - this should transfer the deposit back
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    // Assert: user's balance increased by deposit (minus gas), contract balance decreased
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // On original: user gets money back, contract balance decreases
    // On mutant: withdrawal never executes (oCredit < 0 is always false for uint), so user gets nothing
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
    expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);
  });
});