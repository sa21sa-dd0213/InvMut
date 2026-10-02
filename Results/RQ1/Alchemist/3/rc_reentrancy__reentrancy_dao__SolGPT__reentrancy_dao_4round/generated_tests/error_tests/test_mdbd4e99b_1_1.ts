import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant that adds 1 wei to credit on deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    
    // User deposits exactly 1 ether
    const txDeposit = await instance.connect(user).deposit({ value: depositAmount });
    await txDeposit.wait();

    // User tries to withdraw all
    const txWithdraw = instance.connect(user).withdrawAll();
    
    // The mutant adds 1 wei to credit, so contract will try to send depositAmount + 1 wei
    // but only has depositAmount in balance, causing a revert
    await expect(txWithdraw).to.be.reverted;
  });
});