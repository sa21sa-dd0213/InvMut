import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m05573959", function () {
  it("should revert when owner calls withdrawAll due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so balance is non-zero
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw, but mutant changes modifier to only allow non-owners
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});