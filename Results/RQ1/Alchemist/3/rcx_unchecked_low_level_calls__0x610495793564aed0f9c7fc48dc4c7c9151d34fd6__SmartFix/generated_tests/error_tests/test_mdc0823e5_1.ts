import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls a protected function due to != mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should revert in mutant because require(msg.sender != owner) fails
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});