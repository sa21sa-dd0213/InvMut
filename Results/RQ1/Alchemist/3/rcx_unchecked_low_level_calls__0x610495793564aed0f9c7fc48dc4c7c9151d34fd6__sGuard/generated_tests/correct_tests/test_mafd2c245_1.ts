import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call withdrawAll() - kills mutant mafd2c245", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to call withdrawAll without revert
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });
});