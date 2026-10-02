import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m85902951", function () {
  it("should kill the mutant by verifying owner can call withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so withdrawAll can succeed
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls withdrawAll - should succeed in original, revert in mutant
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});