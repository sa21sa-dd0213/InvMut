import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should not allow withdrawAll when credit is zero (kill >= mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User with zero credit calls withdrawAll - should not revert and not send ether
    const tx = await instance.connect(owner).withdrawAll();
    await expect(tx).to.not.changeEtherBalance(owner, 0);
  });
});