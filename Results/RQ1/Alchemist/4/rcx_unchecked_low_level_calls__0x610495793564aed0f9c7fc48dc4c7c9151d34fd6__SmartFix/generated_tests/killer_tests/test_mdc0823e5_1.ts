import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant mdc0823e5", function () {
  it("owner should be able to call onlyOwner functions; mutant reverts when owner calls", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has something to withdraw
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner calls withdrawAll - should succeed in original, revert in mutant
    const tx = instance.connect(owner).withdrawAll();
    await expect(tx).to.not.be.reverted;
  });
});