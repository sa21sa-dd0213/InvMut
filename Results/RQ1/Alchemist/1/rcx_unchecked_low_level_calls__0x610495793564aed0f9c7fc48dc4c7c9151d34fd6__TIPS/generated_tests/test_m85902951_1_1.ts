import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - onlyOwner modifier", function () {
  it("should revert when owner calls withdrawAll if mutant has != instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there's balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // Therefore, when the owner calls withdrawAll, it should revert on the mutant
    // On the original, it should succeed
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});