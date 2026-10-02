import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m85902951 test", function () {
  it("should revert when owner calls onlyOwner function due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to transfer
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should succeed on original but revert on mutant
    // because the mutant modifier requires msg.sender != owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});