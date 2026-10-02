import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mafd2c245 test", function () {
  it("should allow owner to call withdrawAll and succeed, killing the mutant that uses != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await fundTx.wait();

    // Owner calls withdrawAll - on original this succeeds, on mutant it reverts
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});