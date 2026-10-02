import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should detect mutant m6bb5652f: require((depositsCount - 1) >= depositsCount) reverts on second deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit should succeed (depositsCount becomes 1)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Second deposit should fail on mutant because depositsCount = 1, so require((1 - 1) >= 1) is false
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1.0")
      })
    ).to.be.reverted;
  });
});